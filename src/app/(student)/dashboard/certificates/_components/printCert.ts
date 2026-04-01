// printCert: opens a standalone popup window containing ONLY the certificate HTML,
// then triggers window.print() there. This avoids the blank-PDF problem that occurs
// when window.print() is called from a modal (the backdrop makes the print blank).

export function printCert({
  certId,
  studentName,
  courseName,
  issueDate,
  isFinal,
}: {
  certId: string
  studentName: string
  courseName: string
  issueDate: string
  isFinal: boolean
}) {
  const GOLD     = '#d4a843'
  const GOLD2    = '#e8c96a'
  const BG       = '#0d0d0d'
  const HEADER   = '#111111'
  const BODY     = '#141414'
  const BORDER   = 'rgba(212,168,67,0.45)'
  const TEXT1    = '#f5f0e8'
  const TEXT2    = '#a89878'
  const TEXT3    = '#6b5f45'
  const GOLDFADE = 'rgba(212,168,67,0.18)'

  const qrUrl = 'https://www.ostaran.com/certificate-verification'
  const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=64x64'
    + '&data=' + encodeURIComponent(qrUrl)
    + '&bgcolor=0a0a0a&color=d4a843&margin=2'

  const badgeHtml = isFinal
    ? '<div class="badge-stars">&starf; &starf; &starf; &starf; &starf;</div>'
      + '<div class="badge-label">COURSE GRADUATE</div>'
    : '<div class="badge-stars">&starf;</div>'
      + '<div class="badge-label">ENROLLED STUDENT</div>'

  const headerTitle = isFinal ? 'Certificate of Completion' : 'Certificate of Enrolment'
  const salutation  = isFinal ? 'This is to certify that' : 'This is to confirm that'
  const bodyText    = isFinal
    ? 'has successfully completed all requirements of the programme'
    : 'is currently enrolled in and actively participating in the programme'
  const metaLabel   = isFinal ? 'Completion Date' : 'Certificate Date'
  const marginBottom = isFinal ? '2.5mm' : '2mm'

  const provisionalHtml = isFinal ? '' : (
    '<div class="provisional-box" style="margin-bottom:2mm">'
    + '<div class="provisional-text"><strong>Interim Provisional</strong> &mdash; '
    + 'confirms enrolment only. Does not certify completion. '
    + 'Final Certificate issued upon programme completion.</div>'
    + '</div>'
  )

  const html = '<!DOCTYPE html>'
    + '<html><head>'
    + '<meta charset="UTF-8">'
    + '<title>oStaran Certificate &mdash; ' + certId + '</title>'
    + '<style>'
    + '* { margin: 0; padding: 0; box-sizing: border-box; }'
    + '@page { size: A4 landscape; margin: 0; }'
    + 'html, body {'
    + '  width: 297mm; height: 210mm;'
    + '  background: ' + BG + ';'
    + '  font-family: Georgia, serif;'
    + '  -webkit-print-color-adjust: exact;'
    + '  print-color-adjust: exact;'
    + '}'
    + '.cert { width: 297mm; height: 210mm; background: ' + BG + '; position: relative; overflow: hidden; }'
    + '.border-outer { position: absolute; inset: 8mm; border: 0.5mm solid ' + GOLD + '; pointer-events: none; z-index: 1; }'
    + '.border-inner { position: absolute; inset: 11mm; border: 0.2mm dashed rgba(212,168,67,0.4); pointer-events: none; z-index: 1; }'
    + '.corner { position: absolute; width: 8mm; height: 8mm; z-index: 2; }'
    + '.tl { top: 5mm; left: 5mm; border-top: 1mm solid ' + GOLD + '; border-left: 1mm solid ' + GOLD + '; }'
    + '.tr { top: 5mm; right: 5mm; border-top: 1mm solid ' + GOLD + '; border-right: 1mm solid ' + GOLD + '; }'
    + '.bl { bottom: 5mm; left: 5mm; border-bottom: 1mm solid ' + GOLD + '; border-left: 1mm solid ' + GOLD + '; }'
    + '.br { bottom: 5mm; right: 5mm; border-bottom: 1mm solid ' + GOLD + '; border-right: 1mm solid ' + GOLD + '; }'
    + '.header { background: ' + HEADER + '; border-bottom: 0.2mm solid ' + BORDER + '; margin: 8mm 8mm 0; padding: 4mm 8mm; display: flex; align-items: center; justify-content: space-between; }'
    + '.logo-text { color: ' + TEXT1 + '; font-weight: 700; font-size: 4.5mm; font-family: Inter, sans-serif; letter-spacing: 0.1mm; }'
    + '.header-centre { text-align: center; flex: 1; padding: 0 6mm; }'
    + '.header-sub { color: ' + GOLD + '; font-size: 2.5mm; letter-spacing: 1.2mm; font-weight: 700; text-transform: uppercase; font-family: Inter, sans-serif; }'
    + '.header-title { color: ' + TEXT1 + '; font-size: 5mm; letter-spacing: 0.8mm; font-family: Georgia, serif; margin-top: 1mm; }'
    + '.badge { border: 0.3mm solid ' + GOLD + '; border-radius: 1.5mm; padding: 1.5mm 4mm; text-align: center; min-width: 32mm; background: rgba(212,168,67,0.06); }'
    + '.badge-stars { color: ' + GOLD + '; font-size: 3.5mm; letter-spacing: 0.5mm; }'
    + '.badge-label { color: ' + TEXT1 + '; font-size: 2.2mm; font-weight: 700; letter-spacing: 0.5mm; font-family: Inter, sans-serif; margin-top: 0.5mm; }'
    + '.body { margin: 0 8mm 8mm; background: ' + BODY + '; padding: 5mm 12mm 4mm; display: flex; flex-direction: column; align-items: center; }'
    + '.ornament { display: flex; align-items: center; gap: 3mm; width: 100%; }'
    + '.ornament-line { flex: 1; height: 0.2mm; background: ' + GOLD + '; opacity: 0.35; }'
    + '.ornament-diamond { width: 2mm; height: 2mm; background: ' + GOLD + '; transform: rotate(45deg); }'
    + '.italic-text { color: ' + TEXT2 + '; font-size: 3mm; font-style: italic; }'
    + '.student-name { color: ' + GOLD2 + '; font-size: 9mm; font-weight: 700; text-align: center; line-height: 1.1; }'
    + '.underline-wrap { display: flex; align-items: center; gap: 2mm; width: 55%; }'
    + '.underline-line { flex: 1; height: 0.2mm; background: ' + GOLD + '; }'
    + '.underline-diamond { width: 1.5mm; height: 1.5mm; background: ' + GOLD + '; transform: rotate(45deg); flex-shrink: 0; }'
    + '.body-text { color: ' + TEXT2 + '; font-size: 3mm; font-style: italic; text-align: center; }'
    + '.course-box { border: 0.3mm solid ' + BORDER + '; border-radius: 1mm; background: ' + GOLDFADE + '; padding: 2mm 10mm; text-align: center; }'
    + '.course-name { color: ' + TEXT1 + '; font-size: 4.5mm; font-weight: 700; font-family: Inter, sans-serif; }'
    + '.meta-row { display: flex; align-items: center; gap: 5mm; }'
    + '.meta-item { text-align: center; }'
    + '.meta-label { color: ' + TEXT3 + '; font-size: 2mm; letter-spacing: 0.5mm; text-transform: uppercase; font-family: Inter, sans-serif; }'
    + '.meta-value { color: ' + TEXT1 + '; font-size: 3.5mm; font-weight: 700; margin-top: 0.3mm; }'
    + '.meta-diamond { width: 1.5mm; height: 1.5mm; background: ' + GOLD + '; transform: rotate(45deg); }'
    + '.provisional-box { background: rgba(212,168,67,0.08); border: 0.3mm solid rgba(212,168,67,0.3); border-radius: 1mm; padding: 1.5mm 5mm; width: 100%; text-align: center; }'
    + '.provisional-text { color: ' + GOLD + '; font-size: 2.3mm; font-family: Inter, sans-serif; }'
    + '.divider { width: 100%; height: 0.2mm; background: repeating-linear-gradient(90deg,' + GOLD + ' 0,' + GOLD + ' 1mm,transparent 1mm,transparent 2mm); opacity: 0.4; }'
    + '.sig-row { display: flex; width: 100%; justify-content: space-between; align-items: flex-end; }'
    + '.sig-block { text-align: center; min-width: 40mm; }'
    + '.sig-line { width: 40mm; height: 0.2mm; background: ' + GOLD + '; opacity: 0.5; margin: 0.3mm auto 1mm; }'
    + '.sig-name { color: ' + TEXT1 + '; font-size: 3mm; font-weight: 700; }'
    + '.sig-role { color: ' + TEXT2 + '; font-size: 2.2mm; margin-top: 0.3mm; font-family: Inter, sans-serif; }'
    + '.sig-sub  { color: ' + TEXT3 + '; font-size: 2mm; margin-top: 0.2mm; font-family: Inter, sans-serif; }'
    + '.cert-id-block { background: #0a0a0a; border: 0.3mm solid ' + BORDER + '; border-radius: 1mm; padding: 2mm 4mm; text-align: center; }'
    + '.cert-id-label { color: ' + GOLD + '; font-size: 2mm; font-weight: 700; letter-spacing: 0.7mm; text-transform: uppercase; font-family: Inter, sans-serif; }'
    + '.cert-id-value { color: ' + TEXT1 + "; font-size: 2.8mm; font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 0.3mm; }"
    + '.cert-id-rule { width: 100%; height: 0.2mm; background: ' + BORDER + '; margin: 1mm 0; }'
    + '.cert-id-date { color: ' + TEXT2 + '; font-size: 1.8mm; margin-top: 0.5mm; font-family: Inter, sans-serif; }'
    + '.footer-text { color: ' + TEXT3 + '; font-size: 2mm; font-style: italic; text-align: center; font-family: Georgia, serif; }'
    + '.footer-url  { color: ' + TEXT3 + '; font-size: 1.8mm; letter-spacing: 0.5mm; text-align: center; text-transform: uppercase; font-family: Inter, sans-serif; }'
    + '</style></head><body>'
    + '<div class="cert">'
    + '<div class="border-outer"></div>'
    + '<div class="border-inner"></div>'
    + '<div class="corner tl"></div><div class="corner tr"></div>'
    + '<div class="corner bl"></div><div class="corner br"></div>'
    + '<div class="header">'
    + '<div class="logo-text">oStaran</div>'
    + '<div class="header-centre">'
    + '<div class="header-sub">Star Analytix &middot; AIwithArijit</div>'
    + '<div class="header-title">' + headerTitle + '</div>'
    + '</div>'
    + '<div class="badge">' + badgeHtml + '</div>'
    + '</div>'
    + '<div class="body">'
    + '<div class="ornament" style="margin-bottom:3mm"><div class="ornament-line"></div><div class="ornament-diamond"></div><div class="ornament-line"></div></div>'
    + '<p class="italic-text" style="margin-bottom:2mm">' + salutation + '</p>'
    + '<h1 class="student-name" style="margin-bottom:1.5mm">' + studentName + '</h1>'
    + '<div class="underline-wrap" style="margin-bottom:2.5mm"><div class="underline-line"></div><div class="underline-diamond"></div><div class="underline-line"></div></div>'
    + '<p class="body-text" style="margin-bottom:2.5mm">' + bodyText + '</p>'
    + '<div class="course-box" style="margin-bottom:2.5mm"><div class="course-name">' + courseName + '</div></div>'
    + '<div class="meta-row" style="margin-bottom:' + marginBottom + '">'
    + '<div class="meta-item"><div class="meta-label">' + metaLabel + '</div><div class="meta-value">' + issueDate + '</div></div>'
    + '<div class="meta-diamond"></div>'
    + '<div class="meta-item"><div class="meta-label">Platform</div><div class="meta-value">oStaran AI Education</div></div>'
    + '<div class="meta-diamond"></div>'
    + '<div class="meta-item"><div class="meta-label">Trainer</div><div class="meta-value">Arijit Chowdhury</div></div>'
    + '</div>'
    + provisionalHtml
    + '<div class="divider" style="margin-bottom:2.5mm"></div>'
    + '<div class="sig-row">'
    + '<div class="sig-block">'
    + '<svg width="38mm" height="6mm" viewBox="0 0 150 24" fill="none"><path d="M10 20 C20 10, 32 24, 46 16 C54 11, 62 22, 74 18 C82 15, 90 22, 100 16 C108 11, 118 20, 130 14" stroke="' + GOLD + '" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.8"/></svg>'
    + '<div class="sig-line"></div>'
    + '<div class="sig-name">Antara Chowdhury</div>'
    + '<div class="sig-role">Director, Star Analytix Pvt. Ltd.</div>'
    + '<div class="sig-sub">Mumbai, India</div>'
    + '</div>'
    + '<div class="cert-id-block">'
    + '<div class="cert-id-label">Certificate ID</div>'
    + '<div class="cert-id-value">' + certId + '</div>'
    + '<div class="cert-id-rule"></div>'
    + '<img src="' + qrSrc + '" width="18mm" height="18mm" style="display:block;margin:1mm auto;border-radius:0.5mm;" />'
    + '<div class="cert-id-date">Issued ' + issueDate + '</div>'
    + '<div class="cert-id-date">ostaran.com</div>'
    + '</div>'
    + '<div class="sig-block">'
    + '<svg width="38mm" height="6mm" viewBox="0 0 150 24" fill="none"><path d="M10 18 C22 8, 34 26, 50 14 C60 7, 70 22, 84 16 C94 12, 104 24, 118 14 C124 10, 132 18, 140 12" stroke="' + GOLD + '" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.8"/></svg>'
    + '<div class="sig-line"></div>'
    + '<div class="sig-name">Arijit Chowdhury</div>'
    + '<div class="sig-role">Founder &amp; Lead Trainer, oStaran</div>'
    + '<div class="sig-sub">AIwithArijit &times; oStaran</div>'
    + '</div>'
    + '</div>'
    + '<div class="ornament" style="margin-top:2mm;margin-bottom:1.5mm"><div class="ornament-line"></div><div class="ornament-diamond"></div><div class="ornament-line"></div></div>'
    + '<div class="footer-text">Issued by Star Analytix Private Limited, Mumbai &mdash; Powered by oStaran AI Education Platform</div>'
    + '<div class="footer-url" style="margin-top:0.5mm">Visit ostaran.com/certificate-verification to verify authenticity</div>'
    + '</div>'
    + '</div>'
    + '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}</+'+'script>'
    + '</body></html>'

  const popup = window.open('', '_blank', 'width=1100,height=800')
  if (!popup) {
    alert('Please allow popups for this site to download certificates.')
    return
  }
  popup.document.write(html)
  popup.document.close()
}
