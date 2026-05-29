# Tasarım: Oyunlaştırma — Tasarruf Kumbarası + Streak Yükseltmesi

Tarih: 2026-05-29

## Amaç ve bağlam

Manuel girişli bütçe uygulamasında en büyük risk, kullanıcının ilk haftada bırakması.
İçsel motivasyon (ilerleme görme, tampon biriktirme, zinciri koruma) "her gün açma"
alışkanlığını besler. Yüzeysel puan/rozet/can finans bağlamında ters teper, o yüzden
kaçınılır. Tüm mekanikler **mevcut veriden türer** (gelir, sabit gider, harcamalar,
günlük bütçe). Sosyal/lider tablosu/paylaşım yok.

İki özellik:
- **A) Tasarruf Kumbarası** (kavanoz görseli) — eski "kumbara" + "günlük artış" fikirleri tek mekanikte.
- **B) Streak Yükseltmesi** — kilometre taşları + aylık freeze (telafi) jetonu.

## Navigasyon / bilgi mimarisi (yeni)

Kurulum tamamlandıktan sonraki ana akış **alt tab bar** ile 3 sekmeye ayrılır:

- 🧮 **Bugün** — VARSAYILAN açılış. Şu anki ekran aynen: gün gezgini, hero (count-up),
  streak satırı, kümülatif bakiye satırı, numpad, harcama listesi. Hesap-makinesi hissi korunur.
- 📊 **İstatistik** — mevcut istatistik ekranı. Header'daki 📊 butonu ve "‹ geri" tuşu KALKAR;
  yerini alt sekme alır.
- 🫙 **Kumbara** — animasyonlu tasarruf kavanozu (Özellik A). İleride başka ilerleme/kutlama
  animasyonları için ev.

- **Üst sağdaki ⚙ kalır** (Kurulumu düzenle · CSV · JSON yedek · içe aktar) — sekme değil.
- **Kurulum ekranında alt bar YOK** (tam ekran). Alt bar yalnız 3 ana sekmede görünür.
- Aktif sekme bir `activeTab` durumunda tutulur; her ana ekran kendi içeriğini + sabit alt barı çizer.
- **Streak göstergesi Bugün sekmesinde kalır** (hero altında, günlük dürtü).

## İlkeler / kısıtlar

- Vanilla, build yok, bağımlılık yok. Saf hesap modülleri ayrı dosyada, test edilebilir.
- `budget.js`, `payroll.js`, `stats.js`, ayar geçmişi mantığı DEĞİŞMEZ.
- Renkler mevcut CSS değişkenlerinden (`--accent`, `--danger`). Yeni global stil sistemi yok.
- `prefers-reduced-motion` açıksa animasyon yok.

---

## A) Tasarruf Kumbarası

### Hesap — yeni saf modül `js/savings.js`

`budget.js`'in `computeBudget` çıktısını ve dönemin tasarruf hedefini girdi alır; DOM/DB yok.

```
Savings.compute({
  periodVariableBudget,  // V (r.periodVariableBudget)
  savingsTarget,         // dönemde geçerli aylık tasarruf hedefi
  daysInPeriod,          // r.daysInPeriod
  daysAccrued,           // r.daysAccrued (dönem başından bugüne, bugün dahil)
  spentThisPeriod,       // r.spentThisPeriod
  spentToday             // bugün yapılan harcama toplamı
}) -> { target, saved, pct, overflow, todayContrib } | null
```

Formül (ay başında doğal olarak sıfırlanır — dönem-kapsamlı):

```
gunlukPay      = (periodVariableBudget + savingsTarget) / daysInPeriod   // = (gelir−sabit)/N
saved          = daysAccrued * gunlukPay - spentThisPeriod
target         = savingsTarget
pct            = saved / target            // görselde 0..1'e clamp; >1 = overflow
overflow       = saved > target
todayContrib   = gunlukPay - spentToday     // "bugün +X" başlığı için
```

- `savingsTarget <= 0` ise `compute` **null** döner → kumbara hiç gösterilmez.
- `saved` negatif olabilir (ağır aşım) → fill görselde 0'a clamp, "geride" muted hali.
- Doğrulama (örnek: hedef 6.000, V=15.000, N=30 → gunlukPay=700):
  - Gün1 spent0 → saved 700 · Gün2 spent500 → 900 · Gün3 spent1200 → 900. ✓

### Görsel — Kumbara sekmesi (`renderKumbara`)

Kavanoz, **Bugün** ekranında değil, kendi **Kumbara sekmesinde** yaşar. Bugün ekranındaki
"Kümülatif bakiye" satırı olduğu gibi kalır (değişmez).

Kumbara sekmesi içeriği (tasarruf hedefi > 0 ise):
- **Büyük kavanoz**: dikey, alttan yukarı `--accent` gradyanla `pct` yüksekliğine dolar.
- Altında: `Bu ay biriken: {saved} / {target} TL` (birincil) + `Kümülatif +{cumulativeBalance} TL` (küçük, muted).
- Sekmeye her girişte kavanoz **height transition** (~500ms ease-out) ile mevcut değere dolar.
- `todayContrib > 0` ise kısa micro-başlık: `bugün +{todayContrib} TL`.
- `overflow` → kavanoz dolu + hafif glow + `✨ hedefin %X üstünde` etiketi.
- `prefers-reduced-motion` → transition yok, anında.
- **Tasarruf hedefi 0** → sekme içeriği boş-durum mesajı: "Tasarruf hedefi belirlersen
  burada kumbaran dolmaya başlar" + Kurulumu düzenle kısayolu. (Kavanoz yok.)

Hesap güncel gerçek güne göredir (gün gezgininden bağımsız; Kumbara sekmesinde gezgin yok).

---

## B) Streak Yükseltmesi

Mevcut `js/streak.js` ve hero altındaki "🔥 X gündür takipte" satırı üstüne eklenir.

### Kilometre taşları (stateless)

`current` değerinden türer, kalıcı veri yok:
- `current >= 7` → alev/etiket rengi koyulaşır (kademe 1).
- `current >= 30` → ayrı kademe (kademe 2).
Sadece streak satırının stilini değiştirir; yeni öğe eklemez.

### Aylık freeze (telafi) jetonu — tek kalıcı state

Amaç: "bir gün kaçırdım, bıraktım" çöküşünü engellemek. Ayda **1** telafi.

**State** — `settings.streakFreeze = { month: 'YYYY-MM', coveredDay: 'YYYY-MM-DD' | null }`
- `month`: jetonun ait olduğu takvim ayı. Ay değişince jeton yenilenir (coveredDay sıfırlanır).
- `coveredDay`: bu ay tüketildiyse, köprülenen boşluk günü.

**streak.js saf kalır**: `compute(expenses, { now, todaySpendable, frozenDays })` —
`frozenDays` (YYYY-MM-DD listesi) loglu-gün kümesine eklenerek zincir sürekliliği sağlanır.

**Freeze tüketme (app tarafı, yan etki = persist):**
1. Loglu-gün kümesini kur. Zincir sonunu bul (bugün loglu ise bugün, değilse dün).
2. Zinciri geriye yürürken **tek bir boşluk gün** zinciri kıracaksa VE bu takvim ayında
   jeton kullanılmamışsa (`coveredDay == null` ve `month == buAy`): o günü `coveredDay`
   yap, persist et, `frozenDays`'e ekle. Yalnız **bir** boşluk köprülenir.
3. Streak satırında `❄️ 1 telafi kullanıldı` ibaresi gösterilir.
4. Ay değiştiğinde `streakFreeze` yeni aya resetlenir (`coveredDay = null`).

Notlar:
- Freeze yalnız **tek günlük** boşluğu köprüler; iki üst üste kaçırma yine zinciri kırar.
- Geçmiş ayların boşlukları için geriye dönük telafi yok (yalnız güncel ay jetonu).

---

## Dokunulan dosyalar

- **Yeni:** `js/savings.js` (saf), `test/savings.test.html` + `test/savings.tests.js`.
- **Değişen:**
  - `js/app.js`:
    - Alt tab bar + `activeTab` durumu; 3 ana ekranda sabit bar, kurulumda yok.
    - `renderMain` (Bugün): header'dan 📊 kalkar; streak + count-up korunur.
    - `renderStats`: header'daki "‹ geri" kalkar (alt sekme yönetir).
    - `renderKumbara` (yeni): animasyonlu kavanoz + tasarruf ilerlemesi + boş-durum.
    - Freeze tüketme mantığı (persist) + streak satırına `❄️` ibaresi.
  - `css/styles.css`: alt tab bar, kavanoz, streak kademe + freeze, kumbara boş-durum.
  - `js/streak.js`: `frozenDays` girdisi.
  - `index.html`: `savings.js` script.
  - `service-worker.js`: ASSETS + cache sürümü artır.
- **Değişmeyen:** `js/budget.js`, `js/payroll.js`, `js/stats.js` (hesap çıktısı aynen kullanılır),
  `js/db.js` (yalnız `settings.streakFreeze` opsiyonel alanı eklenir — şema değişmez).

## Test

- `savings.tests`: gunlukPay formülü; çok günlü örnek (700→900→900); aşımda geride kalma;
  overflow (hedef aşımı); tasarruf hedefi 0 → null; dönem ortası başlangıç (daysAccrued).
- `streak` freeze: tek boşluk + jeton → zincir sürer; iki boşluk → kırılır; jeton ay başına
  yenilenir; jeton tükendiyse ikinci boşluk köprülenmez. (Mevcut 8 streak testi korunur.)
- Mevcut `budget` 9 testi değişmeden geçer.

## Kapsam dışı (YAGNI)

- Puan/seviye/XP, avatar/evcil hayvan, can.
- Kategori bazlı görev/challenge.
- Geçmiş ay kumbara geçmişi ekranı.
- Sosyal/paylaşım/lider tablosu.
