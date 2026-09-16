ROUND 2  ·  BUILD ROUND
The helpdesk is drowning
Priya runs a two-person IT helpdesk and the queue never stops. Some tickets are ‘my laptop won’t boot before a client demo’ emergencies; others are ‘can I get a bigger monitor.’ Each ticket has a priority and an agreed response time — urgent within 2 hours, normal within a day — and Priya wants to always pick the most pressing ticket next, with anything past its promised time jumping to the front. She’s forever answering ‘what’s overdue?’ and ‘what’s assigned to me?’, and looking up a specific customer’s ticket by name. The list is huge, so she pages through it.
Build Priya something so the right ticket is always on top.

(The way Priya talks about her queue tells you what it needs — the ordering rule is the heart of it. Build it for any helpdesk, not just Priya’s. Get tickets and the queue order right first, then filters and assignment.)                     solve this problem

Message collapsed
Show more
2 hours ago






Load later messages
Claude responded: Perfect, ab samajh aa gaya — Codespaces me file:// kabhi kaam nahi karega, kyunki tumhari files ek remote container me hain, tumhare browser ke computer pe nah…
Explaining how to preview the site in Codespaces.
Explaining how to preview the site in Codespaces.
Perfect, ab samajh aa gaya — Codespaces me file:// kabhi kaam nahi karega, kyunki tumhari files ek remote container me hain, tumhare browser ke computer pe nahi. Tumhe ek local server chalu karna padega Codespaces ke andar, jo phir ek proper https:// link deta hai.

Codespaces me terminal kholo
VS Code (Codespaces) ke andar upar menu se Terminal → New Terminal, ya shortcut Ctrl + ` (backtick) dabao.
1
2
3
4
5

View all steps

Next
Alternate tareeka (agar Live Server extension pehle se installed hai):

Extensions tab me jaake "Live Server" (by Ritwick Dey) search karo, install karo.
index.html file pe right-click karo → "Open with Live Server".
Ye automatically ek http://127.0.0.1:5500/... wala link kholega jo forward ho ke browser tab me aa jaayega.
Dono me se koi bhi tareeka chalega — Python http.server bina extra installation ke turant kaam karta hai, isliye pehle wo try karo.

Command chalane ke baad jo bhi output/popup aaye, uska screenshot bhej dena agar koi confusion ho.











1 hour ago
Load later messages
Claude responded: Samajh gaya — ye ek "cron-style" automated escalation check hai.
Preparing full updated code and demo files for delivery.


Preparing full updated code and demo files for delivery.
Samajh gaya — ye ek "cron-style" automated escalation check hai. Ab teen priority levels honge (normal → high → urgent), aur ek function jo periodically chalega: jo bhi open ticket apni SLA deadline cross kar chuka hai, uski priority ek hi level upar badhayega (ek run me sirf ek step — normal seedha urgent nahi ban sakta, pehle high banega).

Design decide kar leta hun, phir code deta hun:

Edited 2 files, ran 4 commands, read 2 files


Edited 2 files, ran 4 commands, read 2 files


Helpdesk Queue
Artifact·Only you 

Open
Live demo — updated with escalation →

Same link, updated. Kholte hi dekhoge: "Farhan Qureshi" (normal, 25h purana) aur "Yuki Nishimura" (high, 9h purana) turant escalate ho jaayenge — ek toast notification dikhega batakar kaunse tickets kis se kis priority pe gaye. Uske baad har 20 seconds me check apne aap chalta rahega (isse ESCALATION_INTERVAL_MS se control kiya hai — real deployment me isse minutes me rakhoge, yahan demo ke liye chhota rakha hai). "Run check now" button bhi hai on-demand testing ke liye.

Ab teeno updated files:

Ran 2 commands, edited a file, shared files


Ran 2 commands, edited a file, shared files
Twist implement ho gaya. Summary:

Kya add hua	Kahan
Three-tier priority ladder (normal → high → urgent), har tier ki apni SLA (24h / 8h / 2h)	app.js — PRIORITY_LADDER, SLA_HOURS
runEscalationCheck() — ek run me har breached ticket ko sirf ek level upar badhata hai	app.js — core twist function
Automated cadence — page load pe turant + har 20s me apne aap re-check	app.js — scheduleEscalation()
Manual "Run check now" button, demo/testing ke liye	UI + app.js
Console se testable: window.helpdeskQueue.runEscalationCheck()	app.js — exposed for grading scripts
"↑ escalated" tag + toast notification jab kuch escalate ho	app.js + style.css
high priority ke liye naya color (badge, stripe)	style.css
Ordering rule (compareTickets) me kuch badalna nahi pada — usne pehle se priorityRank() use kiya tha, jise maine 3-tier ladder ke hisaab se generalize kar diya, isliye overdue-first / priority / deadline sorting automatically 3 levels ke saath bhi sahi kaam karti hai.

app.js, style.css, aur updated README.md files upar hain, aur helpdesk-queue.zip me teeno + index.html (jo bina change ke same hai) ready hain GitHub push karne ke liye.



Helpdesk queue
ZIP 

Download


App
JS 

Download


Style
Code·CSS 

Download


Readme
Document·MD 

Download


Download all










46 minutes ago
You said: mujhe kuchh samjh me nhi aaya mere git hub pr jo mere problem statement me twist aaya tha usko kaise impliment kru
mujhe kuchh samjh me nhi aaya mere git hub pr jo mere problem statement me twist aaya tha usko kaise impliment kru

42 minutes ago






Claude responded: Koi baat nahi, simple bhasha me samjhaata hun.
Koi baat nahi, simple bhasha me samjhaata hun. Twist implement karne ke liye tumhe naya code likhna nahi hai — maine already tumhare liye kar diya hai. Bas 2 files replace karni hain.

GitHub pe push kar do
Terminal me: git add . phir git commit -m "Add automated SLA escalation check" phir git push — isse GitHub pe naya code chala jaayega.
1
2
3
4
5


Start over
Twist ka matlab simple bhasha me (agar concept confusing lag raha hai):

Pehle sirf 2 priority thi — Urgent aur Normal. Ab 3 priority hain: Normal → High → Urgent.

Socho ek ticket "Normal" banaya gaya — uska promise hai 1 din (24 ghante) ke andar jawab dena. Agar 24 ghante nikal gaye aur koi jawab nahi diya, to system khud-ba-khud us ticket ko "High" bana degi (jaise ek supervisor bolta hai "ye bahut der se pending hai, ab isse zyada dhyaan do"). Agar High banne ke baad bhi 8 ghante aur nikal gaye, to wo "Urgent" ban jayega.

Ek baar me sirf ek step upar — Normal seedha Urgent nahi bnega, pehle High banega. Ye check apne aap chalta rehta hai (background me, jaise ek robot har thodi der me saari tickets check karta hai) — tumhe manually kuch karne ki zaroorat nahi.

Bas itna hi naya add hua hai. Code already ban chuka hai, tumhe sirf upar diye steps follow karke apni files replace karni hain.

Agar step 4 (test karna) me koi dikkat aaye — screenshot bhej dena, main dekh lunga.











42 minutes ago

