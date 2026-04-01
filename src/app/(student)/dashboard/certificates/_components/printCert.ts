// printCert — opens a popup with ONLY the certificate, then auto-prints.
// Uses Blob URL (not document.write) for reliable rendering.
// CRITICAL sizing strategy:
//   - html/body fill exactly 100vw × 100vh (the whole page)
//   - @page sets A4 landscape with zero margins
//   - All sizing uses % / vw / vh so content always fills the page exactly
//   - No mm units in the content itself (only in @page)

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
  const G  = '#d4a843'
  const G2 = '#e8c96a'
  const BG = '#0d0d0d'
  const HH = '#111111'
  const BD = '#141414'
  const BR = 'rgba(212,168,67,0.45)'
  const T1 = '#f5f0e8'
  const T2 = '#a89878'
  const T3 = '#6b5f45'
  const GF = 'rgba(212,168,67,0.18)'

  const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=80x80'
    + '&data=' + encodeURIComponent('https://www.ostaran.com/certificate-verification')
    + '&bgcolor=0a0a0a&color=d4a843&margin=2'

  const headerTitle  = isFinal ? 'Certificate of Completion' : 'Certificate of Enrolment'
  const salutation   = isFinal ? 'This is to certify that'   : 'This is to confirm that'
  const achievement  = isFinal
    ? 'has successfully completed all requirements of the programme'
    : 'is currently enrolled in and actively participating in the programme'
  const dateLabel    = isFinal ? 'Completion Date' : 'Certificate Date'

  const badgeContent = isFinal
    ? '<div class="bs">&#9733; &#9733; &#9733; &#9733; &#9733;</div><div class="bl">COURSE GRADUATE</div>'
    : '<div class="bs" style="font-size:2.2vw">&#127891;</div><div class="bl">ENROLLED STUDENT</div>'

  const provHtml = isFinal ? '' : (
    '<div class="prov">'
    + '<strong>Interim Provisional</strong> &#8212; confirms enrolment only. '
    + 'Does not certify completion. '
    + 'Final Certificate issued upon programme completion.'
    + '</div>'
  )

  const sig1 = '<svg width="100%" height="8vh" viewBox="0 0 150 24" fill="none" preserveAspectRatio="none">'
    + '<path d="M10 20 C20 10,32 24,46 16 C54 11,62 22,74 18 C82 15,90 22,100 16 C108 11,118 20,130 14"'
    + ' stroke="' + G + '" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.85"/>'
    + '</svg>'

  const sig2 = '<svg width="100%" height="8vh" viewBox="0 0 150 24" fill="none" preserveAspectRatio="none">'
    + '<path d="M10 18 C22 8,34 26,50 14 C60 7,70 22,84 16 C94 12,104 24,118 14 C124 10,132 18,140 12"'
    + ' stroke="' + G + '" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.85"/>'
    + '</svg>'

  const logoSvg = '<svg width="4vh" height="4vh" viewBox="0 0 48 48" fill="none">'
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

  const orn = '<div class="orn"><div class="ol"></div><div class="od"></div><div class="ol"></div></div>'

  const css = [
    '* { margin:0; padding:0; box-sizing:border-box; }',

    // A4 landscape, zero margins — content fills the whole physical page
    '@page { size:A4 landscape; margin:0; }',

    // html/body exactly fill the print area
    'html,body {',
    '  width:100%; height:100%;',
    '  background:' + BG + ';',
    '  font-family:Georgia,serif;',
    '  -webkit-print-color-adjust:exact;',
    '  print-color-adjust:exact;',
    '  color-adjust:exact;',
    '  overflow:hidden;',
    '}',

    // The cert div IS the page — uses viewport units so it scales with any print zoom
    '.cert {',
    '  width:100vw; height:100vh;',
    '  background:' + BG + ';',
    '  display:flex; flex-direction:column;',
    '  position:relative; overflow:hidden;',
    '}',

    // Gold borders — inset as % of the shorter dimension
    '.bo { position:absolute; inset:1.8%; border:0.5px solid ' + G + '; pointer-events:none; z-index:1; }',
    '.bi { position:absolute; inset:2.6%; border:0.3px dashed rgba(212,168,67,0.4); pointer-events:none; z-index:1; }',

    // Corner L-shapes
    '.cr { position:absolute; width:3.5%; height:5%; z-index:2; }',
    '.tl { top:1.1%; left:1.1%;   border-top:1.5px solid ' + G + '; border-left:1.5px solid ' + G + '; }',
    '.tr { top:1.1%; right:1.1%;  border-top:1.5px solid ' + G + '; border-right:1.5px solid ' + G + '; }',
    '.bl2{ bottom:1.1%; left:1.1%;  border-bottom:1.5px solid ' + G + '; border-left:1.5px solid ' + G + '; }',
    '.br { bottom:1.1%; right:1.1%; border-bottom:1.5px solid ' + G + '; border-right:1.5px solid ' + G + '; }',

    // Header — fixed height ~20% of page
    '.hdr {',
    '  flex:0 0 auto;',
    '  background:' + HH + '; border-bottom:1px solid ' + BR + ';',
    '  margin:2.2% 2.2% 0;',
    '  padding:1.5% 3%;',
    '  display:flex; align-items:center; justify-content:space-between;',
    '}',
    '.logo { display:flex; align-items:center; gap:1%; }',
    '.lt { color:' + T1 + '; font-weight:700; font-size:2.2vh; font-family:Inter,sans-serif; letter-spacing:0.05em; }',
    '.hc { text-align:center; flex:1; padding:0 2%; }',
    '.hs { color:' + G + '; font-size:1.2vh; letter-spacing:0.35em; font-weight:700; text-transform:uppercase; font-family:Inter,sans-serif; }',
    '.ht { color:' + T1 + '; font-size:2.8vh; letter-spacing:0.15em; font-family:Georgia,serif; margin-top:0.4vh; }',
    '.badge { border:1px solid ' + G + '; border-radius:4px; padding:1% 2%; text-align:center; min-width:11%; background:rgba(212,168,67,0.06); }',
    '.bs { color:' + G + '; font-size:1.8vh; letter-spacing:0.2em; }',
    '.bl { color:' + T1 + '; font-size:1.1vh; font-weight:700; letter-spacing:0.12em; font-family:Inter,sans-serif; margin-top:0.3vh; }',

    // Body — fills remaining height
    '.body {',
    '  flex:1 1 0;',
    '  margin:0 2.2% 2.2%;',
    '  background:' + BD + ';',
    '  padding:2% 5%;',
    '  display:flex; flex-direction:column; align-items:center; justify-content:space-between;',
    '  overflow:hidden;',
    '}',

    // Ornament divider
    '.orn { display:flex; align-items:center; gap:1.5%; width:100%; }',
    '.ol  { flex:1; height:0.5px; background:' + G + '; opacity:0.4; }',
    '.od  { width:1.2%; padding-top:1.2%; background:' + G + '; transform:rotate(45deg); flex-shrink:0; }',

    // Text elements — all vh-based so they scale with page height
    '.it  { color:' + T2 + '; font-size:1.6vh; font-style:italic; }',
    '.sn  { color:' + G2 + '; font-size:5.5vh; font-weight:700; text-align:center; line-height:1; }',
    '.uw  { display:flex; align-items:center; gap:1%; width:50%; }',
    '.ul  { flex:1; height:0.5px; background:' + G + '; }',
    '.ud  { width:1%; padding-top:1%; background:' + G + '; transform:rotate(45deg); flex-shrink:0; }',
    '.bt  { color:' + T2 + '; font-size:1.5vh; font-style:italic; text-align:center; }',
    '.cb  { border:1px solid ' + BR + '; border-radius:2px; background:' + GF + '; padding:0.8% 5%; text-align:center; width:80%; }',
    '.cn  { color:' + T1 + '; font-size:2.2vh; font-weight:700; font-family:Inter,sans-serif; }',

    // Meta row
    '.mr  { display:flex; align-items:center; gap:3%; }',
    '.mi  { text-align:center; }',
    '.ml  { color:' + T3 + '; font-size:1.1vh; letter-spacing:0.1em; text-transform:uppercase; font-family:Inter,sans-serif; }',
    '.mv  { color:' + T1 + '; font-size:2vh; font-weight:700; margin-top:0.2vh; }',
    '.md  { width:0.8%; padding-top:0.8%; background:' + G + '; transform:rotate(45deg); flex-shrink:0; }',

    // Provisional note
    '.prov { background:rgba(212,168,67,0.08); border:1px solid rgba(212,168,67,0.3); border-radius:2px; padding:0.8% 3%; width:100%; text-align:center; color:' + G + '; font-size:1.3vh; font-family:Inter,sans-serif; }',

    // Dashed divider
    '.dv { width:100%; height:0.5px; background:repeating-linear-gradient(90deg,' + G + ' 0,' + G + ' 4px,transparent 4px,transparent 8px); opacity:0.4; }',

    // Signature row
    '.sr { display:flex; width:100%; justify-content:space-between; align-items:flex-end; }',
    '.sb { text-align:center; width:28%; }',
    '.sl { width:80%; height:0.5px; background:' + G + '; opacity:0.5; margin:0.3vh auto 0.6vh; }',
    '.sn2{ color:' + T1 + '; font-size:1.7vh; font-weight:700; }',
    '.sr2{ color:' + T2 + '; font-size:1.2vh; margin-top:0.2vh; font-family:Inter,sans-serif; }',
    '.ss { color:' + T3 + '; font-size:1.1vh; margin-top:0.1vh; font-family:Inter,sans-serif; }',

    // Cert ID block
    '.ci { background:#0a0a0a; border:1px solid ' + BR + '; border-radius:3px; padding:1% 2%; text-align:center; width:20%; }',
    '.cl { color:' + G + '; font-size:1.1vh; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; font-family:Inter,sans-serif; }',
    '.cv { color:' + T1 + "; font-size:1.5vh; font-family:'Courier New',monospace; font-weight:700; letter-spacing:0.05em; margin:0.3vh 0; }",
    '.cr2{ width:100%; height:0.5px; background:' + BR + '; margin:0.5vh 0; }',
    '.cd { color:' + T2 + '; font-size:1.1vh; margin-top:0.3vh; font-family:Inter,sans-serif; }',

    // Footer
    '.ft { color:' + T3 + '; font-size:1.2vh; font-style:italic; text-align:center; font-family:Georgia,serif; }',
    '.fu { color:' + T3 + '; font-size:1vh; letter-spacing:0.12em; text-align:center; text-transform:uppercase; font-family:Inter,sans-serif; margin-top:0.3vh; }',
  ].join('\n')

  const body = [
    '<div class="cert">',
    '  <div class="bo"></div><div class="bi"></div>',
    '  <div class="cr tl"></div><div class="cr tr"></div>',
    '  <div class="cr bl2"></div><div class="cr br"></div>',

    // Header
    '  <div class="hdr">',
    '    <div class="logo">' + logoSvg + '<span class="lt">oStaran</span></div>',
    '    <div class="hc">',
    '      <div class="hs">Star Analytix &middot; AIwithArijit</div>',
    '      <div class="ht">' + headerTitle + '</div>',
    '    </div>',
    '    <div class="badge">' + badgeContent + '</div>',
    '  </div>',

    // Body
    '  <div class="body">',
    '    ' + orn,
    '    <p class="it">' + salutation + '</p>',
    '    <h1 class="sn">' + studentName + '</h1>',
    '    <div class="uw"><div class="ul"></div><div class="ud"></div><div class="ul"></div></div>',
    '    <p class="bt">' + achievement + '</p>',
    '    <div class="cb"><div class="cn">' + courseName + '</div></div>',
    '    <div class="mr">',
    '      <div class="mi"><div class="ml">' + dateLabel + '</div><div class="mv">' + issueDate + '</div></div>',
    '      <div class="md"></div>',
    '      <div class="mi"><div class="ml">Platform</div><div class="mv">oStaran AI Education</div></div>',
    '      <div class="md"></div>',
    '      <div class="mi"><div class="ml">Trainer</div><div class="mv">Arijit Chowdhury</div></div>',
    '    </div>',
    '    ' + provHtml,
    '    <div class="dv"></div>',
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
    '        <img src="' + qrSrc + '" style="display:block;width:8vh;height:8vh;margin:0.5vh auto;border-radius:2px;" />',
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
    '    ' + orn,
    '    <div class="ft">Issued by Star Analytix Private Limited, Mumbai &mdash; Powered by oStaran AI Education Platform</div>',
    '    <div class="fu">Visit ostaran.com/certificate-verification to verify authenticity</div>',
    '  </div>',
    '</div>',
  ].join('\n')

  const html = [
    '<!DOCTYPE html>',
    '<html><head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>oStaran Certificate</title>',
    '<style>' + css + '</style>',
    '</head><body>',
    body,
    '<script>',
    '(function(){',
    '  function doPrint(){',
    // 300ms delay so fonts/images settle
    '    setTimeout(function(){ window.print(); }, 300);',
    '  }',
    '  if(document.readyState==="complete"){ doPrint(); }',
    '  else { window.addEventListener("load", doPrint); }',
    '  window.onafterprint = function(){ window.close(); };',
    '}());',
    '</script>',
    '</body></html>',
  ].join('\n')

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const popup = window.open(url, '_blank', 'width=1200,height=850')
  if (!popup) {
    alert('Please allow popups for this site to download your certificate.')
  }
  setTimeout(function() { URL.revokeObjectURL(url) }, 15000)
}
