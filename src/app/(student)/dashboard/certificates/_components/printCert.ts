// printCert — opens a standalone popup window with the certificate HTML,
// then auto-prints it. Uses Blob URL instead of document.write() for reliable rendering.

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
  const G  = '#d4a843'   // gold
  const G2 = '#e8c96a'   // light gold
  const BG = '#0d0d0d'   // near-black page
  const HH = '#111111'   // header bg
  const BD = '#141414'   // body bg
  const BR = 'rgba(212,168,67,0.45)' // border gold
  const T1 = '#f5f0e8'   // primary text
  const T2 = '#a89878'   // secondary text
  const T3 = '#6b5f45'   // muted text
  const GF = 'rgba(212,168,67,0.18)' // gold fade bg

  const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=64x64'
    + '&data=' + encodeURIComponent('https://www.ostaran.com/certificate-verification')
    + '&bgcolor=0a0a0a&color=d4a843&margin=2'

  const headerTitle  = isFinal ? 'Certificate of Completion' : 'Certificate of Enrolment'
  const salutation   = isFinal ? 'This is to certify that'   : 'This is to confirm that'
  const achievement  = isFinal
    ? 'has successfully completed all requirements of the programme'
    : 'is currently enrolled in and actively participating in the programme'
  const dateLabel    = isFinal ? 'Completion Date' : 'Certificate Date'
  const marginMeta   = isFinal ? '2.5mm' : '2mm'
  const badgeContent = isFinal
    ? '<div class="bs">&starf; &starf; &starf; &starf; &starf;</div><div class="bl">COURSE GRADUATE</div>'
    : '<div class="bs" style="font-size:16px">&#127891;</div><div class="bl">ENROLLED STUDENT</div>'
  const provHtml = isFinal ? '' : [
    '<div class="prov" style="margin-bottom:2mm">',
    '<strong>Interim Provisional</strong> &mdash; confirms enrolment only.',
    ' Does not certify completion.',
    ' Final Certificate issued upon programme completion.',
    '</div>',
  ].join('')

  // SVG paths for signatures (no backticks, no template literals)
  const sig1 = '<svg width="38mm" height="6mm" viewBox="0 0 150 24" fill="none">'
    + '<path d="M10 20 C20 10, 32 24, 46 16 C54 11, 62 22, 74 18 C82 15, 90 22, 100 16 C108 11, 118 20, 130 14"'
    + ' stroke="' + G + '" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.8"/>'
    + '</svg>'

  const sig2 = '<svg width="38mm" height="6mm" viewBox="0 0 150 24" fill="none">'
    + '<path d="M10 18 C22 8, 34 26, 50 14 C60 7, 70 22, 84 16 C94 12, 104 24, 118 14 C124 10, 132 18, 140 12"'
    + ' stroke="' + G + '" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.8"/>'
    + '</svg>'

  const logoSvg = '<svg width="28" height="28" viewBox="0 0 48 48" fill="none">'
    + '<circle cx="24" cy="24" r="14" fill="' + G + '" opacity="0.12"/>'
    + '<line x1="24" y1="10" x2="36" y2="20" stroke="' + G + '" stroke-width="1.5" stroke-linecap="round"/>'
    + '<line x1="36" y1="20" x2="30" y2="36" stroke="' + G + '" stroke-width="1.5" stroke-linecap="round"/>'
    + '<line x1="30" y1="36" x2="12" y2="30" stroke="' + G + '" stroke-width="1.5" stroke-linecap="round"/>'
    + '<line x1="12" y1="30" x2="24" y2="10" stroke="' + G + '" stroke-width="1.5" stroke-linecap="round"/>'
    + '<circle cx="24" cy="10" r="2.5" fill="' + G + '"/>'
    + '<circle cx="36" cy="20" r="2"   fill="' + G + '" opacity="0.8"/>'
    + '<circle cx="30" cy="36" r="2.5" fill="' + G + '"/>'
    + '<circle cx="12" cy="30" r="2"   fill="' + G + '" opacity="0.8"/>'
    + '<circle cx="24" cy="23" r="2"   fill="' + G + '" opacity="0.9"/>'
    + '</svg>'

  const ornament = '<div class="orn"><div class="ol"></div><div class="od"></div><div class="ol"></div></div>'

  // Build the full HTML as one string — NO backticks anywhere in this file
  const html = [
    '<!DOCTYPE html>',
    '<html><head>',
    '<meta charset="UTF-8">',
    '<title>oStaran Certificate</title>',
    '<style>',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    '@page { size:A4 landscape; margin:0; }',
    'html,body {',
    '  width:297mm; height:210mm;',
    '  background:' + BG + ';',
    '  font-family:Georgia,serif;',
    '  -webkit-print-color-adjust:exact;',
    '  print-color-adjust:exact;',
    '  overflow:hidden;',
    '}',
    '.cert {',
    '  width:297mm; height:210mm;',
    '  background:' + BG + ';',
    '  position:relative; overflow:hidden;',
    '}',
    '.bo { position:absolute; inset:8mm; border:0.5mm solid ' + G + '; pointer-events:none; z-index:1; }',
    '.bi { position:absolute; inset:11mm; border:0.2mm dashed rgba(212,168,67,0.4); pointer-events:none; z-index:1; }',
    '.cr { position:absolute; width:8mm; height:8mm; z-index:2; }',
    '.tl { top:5mm; left:5mm;   border-top:1mm solid ' + G + '; border-left:1mm solid ' + G + '; }',
    '.tr { top:5mm; right:5mm;  border-top:1mm solid ' + G + '; border-right:1mm solid ' + G + '; }',
    '.bl2 { bottom:5mm; left:5mm;  border-bottom:1mm solid ' + G + '; border-left:1mm solid ' + G + '; }',
    '.br { bottom:5mm; right:5mm; border-bottom:1mm solid ' + G + '; border-right:1mm solid ' + G + '; }',
    '.hdr {',
    '  background:' + HH + '; border-bottom:0.2mm solid ' + BR + ';',
    '  margin:8mm 8mm 0; padding:4mm 8mm;',
    '  display:flex; align-items:center; justify-content:space-between;',
    '}',
    '.logo { display:flex; align-items:center; gap:2mm; }',
    '.lt { color:' + T1 + '; font-weight:700; font-size:4.5mm; font-family:Inter,sans-serif; }',
    '.hc { text-align:center; flex:1; padding:0 6mm; }',
    '.hs { color:' + G + '; font-size:2.5mm; letter-spacing:1.2mm; font-weight:700; text-transform:uppercase; font-family:Inter,sans-serif; }',
    '.ht { color:' + T1 + '; font-size:5mm; letter-spacing:0.8mm; font-family:Georgia,serif; margin-top:1mm; }',
    '.badge { border:0.3mm solid ' + G + '; border-radius:1.5mm; padding:1.5mm 4mm; text-align:center; min-width:32mm; background:rgba(212,168,67,0.06); }',
    '.bs { color:' + G + '; font-size:3.5mm; letter-spacing:0.5mm; }',
    '.bl { color:' + T1 + '; font-size:2.2mm; font-weight:700; letter-spacing:0.5mm; font-family:Inter,sans-serif; margin-top:0.5mm; }',
    '.body {',
    '  margin:0 8mm 8mm; background:' + BD + ';',
    '  padding:5mm 12mm 4mm;',
    '  display:flex; flex-direction:column; align-items:center;',
    '}',
    '.orn { display:flex; align-items:center; gap:3mm; width:100%; }',
    '.ol  { flex:1; height:0.2mm; background:' + G + '; opacity:0.35; }',
    '.od  { width:2mm; height:2mm; background:' + G + '; transform:rotate(45deg); }',
    '.it  { color:' + T2 + '; font-size:3mm; font-style:italic; }',
    '.sn  { color:' + G2 + '; font-size:9mm; font-weight:700; text-align:center; line-height:1.1; }',
    '.uw  { display:flex; align-items:center; gap:2mm; width:55%; }',
    '.ul  { flex:1; height:0.2mm; background:' + G + '; }',
    '.ud  { width:1.5mm; height:1.5mm; background:' + G + '; transform:rotate(45deg); flex-shrink:0; }',
    '.bt  { color:' + T2 + '; font-size:3mm; font-style:italic; text-align:center; }',
    '.cb  { border:0.3mm solid ' + BR + '; border-radius:1mm; background:' + GF + '; padding:2mm 10mm; text-align:center; }',
    '.cn  { color:' + T1 + '; font-size:4.5mm; font-weight:700; font-family:Inter,sans-serif; }',
    '.mr  { display:flex; align-items:center; gap:5mm; }',
    '.mi  { text-align:center; }',
    '.ml  { color:' + T3 + '; font-size:2mm; letter-spacing:0.5mm; text-transform:uppercase; font-family:Inter,sans-serif; }',
    '.mv  { color:' + T1 + '; font-size:3.5mm; font-weight:700; margin-top:0.3mm; }',
    '.md  { width:1.5mm; height:1.5mm; background:' + G + '; transform:rotate(45deg); }',
    '.prov { background:rgba(212,168,67,0.08); border:0.3mm solid rgba(212,168,67,0.3); border-radius:1mm; padding:1.5mm 5mm; width:100%; text-align:center; color:' + G + '; font-size:2.3mm; font-family:Inter,sans-serif; }',
    '.dv { width:100%; height:0.2mm; background:repeating-linear-gradient(90deg,' + G + ' 0,' + G + ' 1mm,transparent 1mm,transparent 2mm); opacity:0.4; }',
    '.sr { display:flex; width:100%; justify-content:space-between; align-items:flex-end; }',
    '.sb { text-align:center; min-width:40mm; }',
    '.sl { width:40mm; height:0.2mm; background:' + G + '; opacity:0.5; margin:0.3mm auto 1mm; }',
    '.sn2{ color:' + T1 + '; font-size:3mm; font-weight:700; }',
    '.sr2{ color:' + T2 + '; font-size:2.2mm; margin-top:0.3mm; font-family:Inter,sans-serif; }',
    '.ss { color:' + T3 + '; font-size:2mm; margin-top:0.2mm; font-family:Inter,sans-serif; }',
    '.ci { background:#0a0a0a; border:0.3mm solid ' + BR + '; border-radius:1mm; padding:2mm 4mm; text-align:center; }',
    '.cl { color:' + G + '; font-size:2mm; font-weight:700; letter-spacing:0.7mm; text-transform:uppercase; font-family:Inter,sans-serif; }',
    '.cv { color:' + T1 + "; font-size:2.8mm; font-family:'Courier New',monospace; font-weight:700; letter-spacing:0.3mm; }",
    '.cr2{ width:100%; height:0.2mm; background:' + BR + '; margin:1mm 0; }',
    '.cd { color:' + T2 + '; font-size:1.8mm; margin-top:0.5mm; font-family:Inter,sans-serif; }',
    '.ft { color:' + T3 + '; font-size:2mm; font-style:italic; text-align:center; font-family:Georgia,serif; }',
    '.fu { color:' + T3 + '; font-size:1.8mm; letter-spacing:0.5mm; text-align:center; text-transform:uppercase; font-family:Inter,sans-serif; }',
    '</style></head><body>',
    '<div class="cert">',
    '  <div class="bo"></div>',
    '  <div class="bi"></div>',
    '  <div class="cr tl"></div><div class="cr tr"></div>',
    '  <div class="cr bl2"></div><div class="cr br"></div>',
    '  <div class="hdr">',
    '    <div class="logo">' + logoSvg + '<span class="lt">oStaran</span></div>',
    '    <div class="hc">',
    '      <div class="hs">Star Analytix &middot; AIwithArijit</div>',
    '      <div class="ht">' + headerTitle + '</div>',
    '    </div>',
    '    <div class="badge">' + badgeContent + '</div>',
    '  </div>',
    '  <div class="body">',
    '    ' + ornament.replace('class="orn"', 'class="orn" style="margin-bottom:3mm"'),
    '    <p class="it" style="margin-bottom:2mm">' + salutation + '</p>',
    '    <h1 class="sn" style="margin-bottom:1.5mm">' + studentName + '</h1>',
    '    <div class="uw" style="margin-bottom:2.5mm"><div class="ul"></div><div class="ud"></div><div class="ul"></div></div>',
    '    <p class="bt" style="margin-bottom:2.5mm">' + achievement + '</p>',
    '    <div class="cb" style="margin-bottom:2.5mm"><div class="cn">' + courseName + '</div></div>',
    '    <div class="mr" style="margin-bottom:' + marginMeta + '">',
    '      <div class="mi"><div class="ml">' + dateLabel + '</div><div class="mv">' + issueDate + '</div></div>',
    '      <div class="md"></div>',
    '      <div class="mi"><div class="ml">Platform</div><div class="mv">oStaran AI Education</div></div>',
    '      <div class="md"></div>',
    '      <div class="mi"><div class="ml">Trainer</div><div class="mv">Arijit Chowdhury</div></div>',
    '    </div>',
    '    ' + provHtml,
    '    <div class="dv" style="margin-bottom:2.5mm"></div>',
    '    <div class="sr">',
    '      <div class="sb">',
    '        ' + sig1,
    '        <div class="sl"></div>',
    '        <div class="sn2">Antara Chowdhury</div>',
    '        <div class="sr2">Director, Star Analytix Pvt. Ltd.</div>',
    '        <div class="ss">Mumbai, India</div>',
    '      </div>',
    '      <div class="ci">',
    '        <div class="cl">Certificate ID</div>',
    '        <div class="cv">' + certId + '</div>',
    '        <div class="cr2"></div>',
    '        <img src="' + qrSrc + '" width="18mm" height="18mm" style="display:block;margin:1mm auto;border-radius:0.5mm;" onload="window._qrLoaded=true" />',
    '        <div class="cd">Issued ' + issueDate + '</div>',
    '        <div class="cd">ostaran.com</div>',
    '      </div>',
    '      <div class="sb">',
    '        ' + sig2,
    '        <div class="sl"></div>',
    '        <div class="sn2">Arijit Chowdhury</div>',
    '        <div class="sr2">Founder &amp; Lead Trainer, oStaran</div>',
    '        <div class="ss">AIwithArijit &times; oStaran</div>',
    '      </div>',
    '    </div>',
    '    ' + ornament.replace('class="orn"', 'class="orn" style="margin-top:2mm;margin-bottom:1.5mm"'),
    '    <div class="ft">Issued by Star Analytix Private Limited, Mumbai &mdash; Powered by oStaran AI Education Platform</div>',
    '    <div class="fu" style="margin-top:0.5mm">Visit ostaran.com/certificate-verification to verify authenticity</div>',
    '  </div>',
    '</div>',
    // Auto-print: wait for QR image then print
    '<script>',
    '(function() {',
    '  function tryPrint() {',
    '    if (document.readyState === "complete") {',
    '      setTimeout(function() { window.print(); }, 300);',
    '    } else {',
    '      window.addEventListener("load", function() {',
    '        setTimeout(function() { window.print(); }, 300);',
    '      });',
    '    }',
    '  }',
    '  tryPrint();',
    '  window.onafterprint = function() { window.close(); };',
    '}());',
    '</script>',
    '</body></html>',
  ].join('\n')

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const blobUrl = URL.createObjectURL(blob)

  const popup = window.open(blobUrl, '_blank', 'width=1200,height=850')
  if (!popup) {
    alert('Please allow popups for this site to download your certificate.')
    URL.revokeObjectURL(blobUrl)
    return
  }

  // Clean up blob URL after popup has loaded
  setTimeout(function() { URL.revokeObjectURL(blobUrl) }, 10000)
}
