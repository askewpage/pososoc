// Content layer: log templates, vulnerability categories, difficulty curve.
// Everything here is data — no game logic lives in this file.

export const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pick = (arr) => arr[rand(0, arr.length - 1)];

const ip = () => `${rand(1, 223)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;
const port = () => pick([22, 80, 135, 443, 445, 1433, 3306, 3389, 5432, 6379, 8080, 8443, 9200]);
const ms = () => rand(4, 890);
const USERS = ['jsmith', 'agupta', 'mkovacs', 'r.ivanova', 'admin', 'svc_backup', 'n.petrov', 'l.chen', 'k.oconnor', 'root', 'deploy_bot', 'helpdesk1', 'a.mueller', 'y.tanaka'];
const COUNTRIES = ['US', 'DE', 'NL', 'RU', 'CN', 'BR', 'FR', 'SG', 'IN', 'UA', 'GB', 'KZ', 'VN', 'NG'];
const SERVICES = ['auth-service', 'api-gateway', 'payment-svc', 'db-proxy', 'web-frontend', 'vpn-gateway', 'mail-server', 'k8s-ingress', 'file-storage', 'billing-api', 'crm-backend', 'edge-lb'];
const PATHS = ['/api/v1/users', '/login', '/admin/console', '/checkout', '/reports/export', '/api/v1/orders', '/static/app.js', '/health', '/api/v1/invoices', '/wp-login.php', '/account/settings', '/api/v2/search'];
const HOSTS = ['db-mal-relay.top', 'update-cdn-sync.net', 'telemetry-beacon.io', 'freehost-panel.ru', 'cdn-assets-mirror.xyz'];
const FILES = ['invoice_2024.pdf.exe', 'payroll_backup.zip', 'quarterly_report.docm', 'setup_patch.bin', 'update.ps1'];

// ---- Vulnerability / incident categories ------------------------------
export const CATEGORIES = {
  brute_force:        { label: 'Brute Force / Credential Stuffing', color: '#ff9d3f', mitre: 'T1110' },
  sqli:                { label: 'SQL Injection',                    color: '#c792ea', mitre: 'T1190' },
  xss:                 { label: 'Cross-Site Scripting',             color: '#82aaff', mitre: 'T1059.007' },
  path_traversal:      { label: 'Path Traversal',                   color: '#4fd6be', mitre: 'T1083' },
  cmd_injection:       { label: 'Command Injection',                color: '#ff6b9d', mitre: 'T1059' },
  port_scan:           { label: 'Port Scanning / Recon',            color: '#f8c555', mitre: 'T1046' },
  malware:             { label: 'Malware Signature Match',          color: '#ff5555', mitre: 'T1204' },
  phishing:            { label: 'Phishing / Credential Harvest',    color: '#ffd166', mitre: 'T1566' },
  privesc:             { label: 'Privilege Escalation',             color: '#ef476f', mitre: 'T1068' },
  exfil:               { label: 'Data Exfiltration',                color: '#f78c6b', mitre: 'T1041' },
  impossible_travel:   { label: 'Impossible Travel',                color: '#06d6a0', mitre: 'T1078' },
  ransomware:          { label: 'Ransomware Activity',              color: '#e63946', mitre: 'T1486' },
  c2_beacon:           { label: 'C2 Beaconing',                     color: '#9b5de5', mitre: 'T1071' },
  ddos:                { label: 'DDoS / Flood',                     color: '#ff595e', mitre: 'T1498' },
  insider:             { label: 'Insider Threat',                   color: '#ffca3a', mitre: 'T1530' },
  zero_day:            { label: 'Exploit / CVE Attempt',            color: '#f15bb5', mitre: 'T1203' },
};

// ---- Benign (non-threat) log lines -------------------------------------
export function benignLine() {
  const svc = pick(SERVICES);
  const kind = pick(['info', 'info', 'info', 'debug', 'warning', 'error']);
  const generators = {
    info: () => pick([
      `GET ${pick(PATHS)} 200 ${ms()}ms user=${pick(USERS)} ip=${ip()}`,
      `Health check OK — ${svc} latency=${ms()}ms`,
      `Session established for user=${pick(USERS)} from ${ip()} (${pick(COUNTRIES)})`,
      `Cache warm complete: ${rand(100, 9000)} keys loaded`,
      `Scheduled backup finished in ${rand(1, 40)}m ${rand(0, 59)}s`,
      `Config reload applied — 0 errors`,
      `POST /api/v1/orders 201 ${ms()}ms order_id=${rand(10000, 99999)}`,
      `Autoscaler: added 1 replica to ${svc} (cpu=78%)`,
      `TLS handshake completed for client ${ip()}`,
      `Password changed successfully for user=${pick(USERS)}`,
      `Webhook delivered to partner endpoint (200 OK)`,
      `Nightly report emailed to finance@company.internal`,
    ]),
    debug: () => pick([
      `Connection pool: 12/50 in use (${svc})`,
      `GC pause ${rand(1, 40)}ms, heap=${rand(200, 900)}MB`,
      `Feature flag "new-checkout" evaluated -> false`,
      `Retrying upstream call (attempt 1/3)`,
      `Cache miss for key user:${rand(1000, 9999)}`,
    ]),
    warning: () => pick([
      `Disk usage at ${rand(70, 89)}% on ${svc}-node-${rand(1, 4)}`,
      `Deprecated API endpoint ${pick(PATHS)} called by client v1.2`,
      `Slow query detected (${rand(900, 2500)}ms) on ${svc}`,
      `Certificate for ${svc}.internal expires in ${rand(5, 25)} days`,
      `Queue depth elevated: ${rand(500, 4000)} messages`,
    ]),
    error: () => pick([
      `Upstream timeout calling ${svc} (504)`,
      `Failed to send email notification: SMTP timeout`,
      `Payment gateway returned 502, retry scheduled`,
      `Disk write failed on ${svc}-node-${rand(1, 4)}, retrying`,
    ]),
  };
  return { level: kind.toUpperCase(), service: svc, message: generators[kind]() };
}

// ---- Threat log lines, grouped by category ------------------------------
// Each template: text (string), defaultLevel, keyword (substring to spotlight in turbo/training)
const T = {
  brute_force: [
    { text: `Failed login for user=admin from ${ip()} (attempt ${rand(6, 40)}/limit)`, level: 'WARNING', keyword: '401' },
    { text: `401 Unauthorized x${rand(15, 90)} from ${ip()} in 60s window — user=root`, level: 'CRITICAL', keyword: '401' },
    { text: `Credential stuffing pattern: ${rand(200, 900)} login attempts from ${ip()} across 40 accounts`, level: 'CRITICAL', keyword: 'Credential stuffing' },
    { text: `Account lockout triggered for user=${pick(USERS)} after repeated 401 from ${ip()}`, level: 'ERROR', keyword: '401' },
  ],
  sqli: [
    { text: `GET ${pick(PATHS)}?id=1' OR '1'='1'-- 200 from ${ip()}`, level: 'INFO', keyword: "OR '1'='1'" },
    { text: `POST /api/v1/search body="'; DROP TABLE users;--" ip=${ip()}`, level: 'CRITICAL', keyword: 'DROP TABLE' },
    { text: `WAF alert: SQL Injection pattern UNION SELECT detected from ${ip()}`, level: 'CRITICAL', keyword: 'SQL Injection' },
    { text: `Query error: syntax near "1=1 UNION SELECT username,password FROM"`, level: 'WARNING', keyword: 'UNION SELECT' },
  ],
  xss: [
    { text: `Comment submitted containing <script>document.location='http://${pick(HOSTS)}'</script>`, level: 'WARNING', keyword: '<script>' },
    { text: `WAF alert: reflected XSS payload onerror=alert(1) blocked from ${ip()}`, level: 'CRITICAL', keyword: 'XSS' },
    { text: `Input field "bio" saved with javascript:fetch('//${pick(HOSTS)}') payload`, level: 'INFO', keyword: 'javascript:' },
  ],
  path_traversal: [
    { text: `GET /files?name=../../../../etc/passwd from ${ip()}`, level: 'WARNING', keyword: '../../../../etc/passwd' },
    { text: `403 Forbidden: traversal attempt ..%2f..%2f..%2fwindows%2fwin.ini blocked`, level: 'CRITICAL', keyword: 'traversal' },
    { text: `File read outside webroot: /var/www/../../etc/shadow requested by ${ip()}`, level: 'ERROR', keyword: '/etc/shadow' },
  ],
  cmd_injection: [
    { text: `POST /api/v1/ping host="8.8.8.8; rm -rf /tmp/*" ip=${ip()}`, level: 'CRITICAL', keyword: 'rm -rf' },
    { text: `Shell exec blocked: input contained "$(whoami)" from ${ip()}`, level: 'WARNING', keyword: '$(whoami)' },
    { text: `WAF alert: OS command injection pattern "| nc -e /bin/sh" from ${ip()}`, level: 'CRITICAL', keyword: 'nc -e /bin/sh' },
  ],
  port_scan: [
    { text: `SYN scan detected: ${ip()} probed ${rand(30, 500)} ports on host in 10s`, level: 'WARNING', keyword: 'SYN scan' },
    { text: `Sequential connection attempts on ports ${port()},${port()},${port()} from ${ip()}`, level: 'INFO', keyword: 'Sequential connection' },
    { text: `IDS: Nmap fingerprint signature matched from ${ip()}`, level: 'CRITICAL', keyword: 'Nmap' },
  ],
  malware: [
    { text: `Download blocked: ${pick(FILES)} matches known malware signature (SHA-256)`, level: 'CRITICAL', keyword: 'malware signature' },
    { text: `Endpoint AV: Trojan.GenKryptik detected in ${pick(FILES)} on host WKS-${rand(100, 400)}`, level: 'CRITICAL', keyword: 'Trojan' },
    { text: `Email attachment ${pick(FILES)} flagged by sandbox: dropper behavior observed`, level: 'WARNING', keyword: 'dropper' },
  ],
  phishing: [
    { text: `User ${pick(USERS)} clicked link in email from "IT-Support@${pick(HOSTS)}" — credential page rendered`, level: 'WARNING', keyword: 'credential page' },
    { text: `Mail gateway: phishing kit detected in inbound message, sender spoofed ceo@company.internal`, level: 'CRITICAL', keyword: 'phishing kit' },
    { text: `Proxy log: user=${pick(USERS)} submitted form on lookalike domain accounts-secure-login.${pick(HOSTS)}`, level: 'INFO', keyword: 'lookalike domain' },
  ],
  privesc: [
    { text: `sudo su granted to non-admin user=${pick(USERS)} on ${pick(SERVICES)}-node-${rand(1, 4)}`, level: 'CRITICAL', keyword: 'sudo su' },
    { text: `UAC bypass technique detected on WKS-${rand(100, 400)} (fodhelper.exe)`, level: 'CRITICAL', keyword: 'UAC bypass' },
    { text: `User ${pick(USERS)} added to group "Domain Admins" outside change window`, level: 'WARNING', keyword: 'Domain Admins' },
  ],
  exfil: [
    { text: `Outbound transfer of ${rand(2, 40)}GB to unrecognized host ${ip()} from db-proxy`, level: 'CRITICAL', keyword: 'Outbound transfer' },
    { text: `DNS tunneling suspected: ${rand(500, 3000)} TXT queries to ${pick(HOSTS)} from ${ip()}`, level: 'WARNING', keyword: 'DNS tunneling' },
    { text: `Bulk export: user=${pick(USERS)} downloaded 14,200 customer records to USB`, level: 'INFO', keyword: 'Bulk export' },
  ],
  impossible_travel: [
    { text: `Login for user=${pick(USERS)} from ${pick(COUNTRIES)} then ${pick(COUNTRIES)} within 4 minutes`, level: 'CRITICAL', keyword: 'Impossible travel' },
    { text: `MFA approved for ${pick(USERS)} from new device in ${pick(COUNTRIES)} — prior session active in ${pick(COUNTRIES)}`, level: 'WARNING', keyword: 'new device' },
  ],
  ransomware: [
    { text: `Mass file rename detected: 4,300 files renamed to *.locked on file-storage-0${rand(1, 3)}`, level: 'CRITICAL', keyword: '.locked' },
    { text: `Ransom note "READ_ME_NOW.txt" created in 12 directories on ${pick(SERVICES)}`, level: 'CRITICAL', keyword: 'Ransom note' },
    { text: `Shadow copy deletion command executed: vssadmin delete shadows /all`, level: 'ERROR', keyword: 'vssadmin delete shadows' },
  ],
  c2_beacon: [
    { text: `Periodic outbound beacon every 60s to ${pick(HOSTS)} from host WKS-${rand(100, 400)}`, level: 'WARNING', keyword: 'beacon' },
    { text: `TLS cert on ${pick(HOSTS)} matches known C2 JA3 fingerprint`, level: 'CRITICAL', keyword: 'C2 JA3' },
  ],
  ddos: [
    { text: `Traffic spike: ${rand(20000, 90000)} req/min from botnet range hitting edge-lb`, level: 'CRITICAL', keyword: 'req/min' },
    { text: `SYN flood detected on ${pick(SERVICES)} — ${rand(5000, 20000)} half-open connections`, level: 'CRITICAL', keyword: 'SYN flood' },
  ],
  insider: [
    { text: `Terminated user=${pick(USERS)} downloaded 900 files 2h after offboarding ticket closed`, level: 'WARNING', keyword: 'Terminated user' },
    { text: `user=${pick(USERS)} accessed payroll DB outside job role at 03:12 local`, level: 'INFO', keyword: 'outside job role' },
  ],
  zero_day: [
    { text: `Exploit attempt for CVE-2024-${rand(1000, 9999)} against ${pick(SERVICES)} blocked by IPS`, level: 'CRITICAL', keyword: 'CVE-2024' },
    { text: `Unusual crash in ${pick(SERVICES)} following crafted request — possible 0-day`, level: 'ERROR', keyword: '0-day' },
  ],
};

export function categoryExample(category) {
  return pick(T[category]).text;
}

export function threatLine(category, disguiseChance) {
  const list = T[category];
  const tpl = pick(list);
  let level = tpl.level;
  if (Math.random() < disguiseChance) {
    level = pick(['INFO', 'WARNING']);
  }
  return {
    level,
    service: pick(SERVICES),
    message: tpl.text,
    isThreat: true,
    category,
    keyword: tpl.keyword,
    mitre: CATEGORIES[category].mitre,
  };
}

// ---- Difficulty curve ---------------------------------------------------
const ALL_CATS = Object.keys(CATEGORIES);
export const LEVELS = [
  { level: 1, name: 'Trainee',            spawnMs: 1500, threatChance: 0.16, disguiseChance: 0,    cats: ['brute_force', 'sqli'] },
  { level: 2, name: 'Analyst I',          spawnMs: 1300, threatChance: 0.18, disguiseChance: 0.05, cats: ['brute_force', 'sqli', 'xss', 'path_traversal'] },
  { level: 3, name: 'Analyst II',         spawnMs: 1150, threatChance: 0.20, disguiseChance: 0.12, cats: ['brute_force', 'sqli', 'xss', 'path_traversal', 'cmd_injection', 'port_scan'] },
  { level: 4, name: 'Senior Analyst',     spawnMs: 1000, threatChance: 0.22, disguiseChance: 0.20, cats: ['sqli', 'xss', 'path_traversal', 'cmd_injection', 'port_scan', 'malware', 'phishing'] },
  { level: 5, name: 'Threat Hunter',      spawnMs: 880,  threatChance: 0.24, disguiseChance: 0.28, cats: ['xss', 'cmd_injection', 'malware', 'phishing', 'privesc', 'exfil'] },
  { level: 6, name: 'Incident Responder', spawnMs: 760,  threatChance: 0.26, disguiseChance: 0.34, cats: ['malware', 'privesc', 'exfil', 'impossible_travel', 'ransomware'] },
  { level: 7, name: 'SOC Lead',           spawnMs: 660,  threatChance: 0.28, disguiseChance: 0.40, cats: ['privesc', 'exfil', 'ransomware', 'c2_beacon', 'ddos', 'insider'] },
  { level: 8, name: 'Cyber Sentinel',     spawnMs: 560,  threatChance: 0.30, disguiseChance: 0.46, cats: ALL_CATS },
];

export function levelConfig(level) {
  if (level <= LEVELS.length) return LEVELS[level - 1];
  const over = level - LEVELS.length;
  const base = LEVELS[LEVELS.length - 1];
  return {
    level,
    name: 'Cyber Sentinel',
    spawnMs: Math.max(380, base.spawnMs - over * 18),
    threatChance: Math.min(0.38, base.threatChance + over * 0.008),
    disguiseChance: Math.min(0.55, base.disguiseChance + over * 0.01),
    cats: ALL_CATS,
  };
}

export const TURBO_CONFIG = { spawnMs: 260, threatChance: 0.22, disguiseChance: 0, cats: ALL_CATS };

export { ALL_CATS };
