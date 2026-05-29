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

### Görsel

`renderMain`'deki mevcut `.balance` ("Kümülatif bakiye") satırı, tasarruf hedefi > 0 ise
şu bileşik bloğa dönüşür:

- **Solda kavanoz**: dikey, alttan yukarı `--accent` gradyanla `pct` yüksekliğine dolar.
- **Sağda iki satır**:
  - Birincil: `Bu ay biriken: {saved} / {target} TL`
  - İkincil (küçük, muted): `Kümülatif +{cumulativeBalance} TL` (korunur)
- Doluluk değişince kavanoz **height transition** (~500ms ease-out) ile yumuşak dolar.
- `todayContrib > 0` ise kavanozun altında kısa micro-başlık: `bugün +{todayContrib} TL` (opsiyonel cila).
- `overflow` → kavanoz dolu + hafif glow + `✨ hedefin %X üstünde` etiketi.
- `prefers-reduced-motion` → transition yok, anında.
- Tasarruf hedefi 0 → kavanoz yok, mevcut sade "Kümülatif bakiye +X" satırı aynen kalır.

Yalnızca **bugün görünümünde** gösterilir (geçmiş gün gezgininde değil), mevcut streak
satırıyla tutarlı.

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
- **Değişen:** `js/streak.js` (frozenDays girdisi), `js/app.js` (renderMain: kumbara + streak
  yükseltme + freeze tüketme), `css/styles.css` (kavanoz + streak kademe + freeze), `index.html`
  (savings.js script), `service-worker.js` (ASSETS + cache sürümü artır).
- **Değişmeyen:** `js/budget.js`, `js/payroll.js`, `js/stats.js`, `js/db.js` (yalnız
  `settings.streakFreeze` alanı eklenir — şema değişmez, opsiyonel alan).

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
