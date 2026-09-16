(function () {
// ---------- Config ----------
  // Three-tier priority ladder, low to high. Each tier carries its own
  // agreed response time (SLA). A ticket escalates up this ladder — never
  // skips a rung — when it breaches the SLA of its *current* tier.
  var PRIORITY_LADDER = ['normal', 'high', 'urgent'];
  var SLA_HOURS = { urgent: 2, high: 8, normal: 24 };
  var STORE_KEY = 'helpdesk_queue_tickets_v1';
  var PAGE_SIZE = 8;
  // How often the automated escalation check runs on its own, in ms.
  // Kept short here so the behaviour is visible in a short demo; in a real
  // deployment this would typically run every few minutes server-side.
  var ESCALATION_INTERVAL_MS = 20000;

  // ---------- State ----------
  var state = {
    tickets: [],
    query: '',
    filter: 'all',        // all | overdue | mine
    priorityFilter: 'all',// all | urgent | high | normal
    assignee: 'all',
    page: 1,
    me: 'Priya',
    lastEscalationRun: null,
    escalationLog: []     // recent escalation events, newest first, for the toast/log UI
  };

  function uid(){ return 't' + Math.random().toString(36).slice(2,9); }
  function hoursAgo(h){ return new Date(Date.now() - h*3600*1000).toISOString(); }
  function minsAgo(m){ return new Date(Date.now() - m*60*1000).toISOString(); }

  function seed(){
    return [
      { id: uid(), customer:'Dana Whitfield', subject:'Laptop won\'t boot before client demo', priority:'urgent', assignee:'Priya', createdAt: hoursAgo(2.6), status:'open' },
      { id: uid(), customer:'Marcus Oyelaran', subject:'VPN drops every few minutes', priority:'urgent', assignee:'Alex', createdAt: hoursAgo(1.1), status:'open' },
      { id: uid(), customer:'Grace Tanaka', subject:'Can I get a bigger monitor', priority:'normal', assignee:'', createdAt: hoursAgo(20), status:'open' },
      { id: uid(), customer:'Idris Kamau', subject:'Shared drive permissions wrong', priority:'normal', assignee:'Priya', createdAt: hoursAgo(4), status:'open' },
      { id: uid(), customer:'Lena Sorokin', subject:'Printer on 3rd floor jamming', priority:'normal', assignee:'Alex', createdAt: hoursAgo(26), status:'open' },
      { id: uid(), customer:'Owen Bradley', subject:'New hire needs accounts provisioned', priority:'urgent', assignee:'', createdAt: minsAgo(40), status:'open' },
      { id: uid(), customer:'Priya Raman', subject:'Email sync stopped on mobile', priority:'normal', assignee:'Priya', createdAt: hoursAgo(3), status:'open' },
      { id: uid(), customer:'Sofia Delgado', subject:'Password reset for locked account', priority:'urgent', assignee:'Alex', createdAt: hoursAgo(3.4), status:'open' },
      { id: uid(), customer:'Tom Holloway', subject:'Second monitor flickering', priority:'normal', assignee:'', createdAt: hoursAgo(2), status:'open' },
      { id: uid(), customer:'Nadia Petrov', subject:'Conference room screen won\'t mirror', priority:'urgent', assignee:'Priya', createdAt: minsAgo(15), status:'open' },
      { id: uid(), customer:'Ben Achebe', subject:'Software license expired', priority:'normal', assignee:'Alex', createdAt: hoursAgo(30), status:'open' },
      { id: uid(), customer:'Chloe Fenwick', subject:'Onboarding laptop setup', priority:'normal', assignee:'', createdAt: hoursAgo(6), status:'open' },
      { id: uid(), customer:'Farhan Qureshi', subject:'Timesheet portal not saving entries', priority:'normal', assignee:'', createdAt: hoursAgo(25), status:'open' },
      { id: uid(), customer:'Yuki Nishimura', subject:'Badge reader denying valid access card', priority:'high', assignee:'Priya', createdAt: hoursAgo(9), status:'open' }
    ];
  }

  function load(){
    try{
      var raw = localStorage.getItem(STORE_KEY);
      if(raw){ state.tickets = JSON.parse(raw); }
      else { state.tickets = seed(); save(); }
    }catch(e){ state.tickets = seed(); }
  }
  function save(){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(state.tickets)); }catch(e){}
  }

  // ---------- Derived ----------
  function deadline(t){
    return new Date(t.createdAt).getTime() + SLA_HOURS[t.priority]*3600*1000;
  }
  function isOverdue(t){
    return t.status === 'open' && Date.now() > deadline(t);
  }
  // Lower rank = more urgent = sorts first. Works for any length ladder.
  function priorityRank(p){
    var idx = PRIORITY_LADDER.indexOf(p);
    return idx === -1 ? PRIORITY_LADDER.length : (PRIORITY_LADDER.length - 1 - idx);
  }
  function nextPriority(p){
    var idx = PRIORITY_LADDER.indexOf(p);
    if(idx === -1 || idx === PRIORITY_LADDER.length - 1) return null; // unknown or already top tier
    return PRIORITY_LADDER[idx + 1];
  }
  function priorityDisplay(p){
    return p === 'urgent' ? 'Urgent' : (p === 'high' ? 'High' : 'Normal');
  }

  // ---------- THE TWIST: automated SLA-breach escalation ----------
  // One "run" = one call of this function (invoked on a timer to simulate
  // an automated/cron check, and also exposed as a manual button).
  // For every open ticket that has breached the response time of its
  // CURRENT priority, bump it exactly one rung up the ladder
  // (normal -> high -> urgent). A ticket already at 'urgent' is left alone
  // — there's nowhere higher to escalate to. A ticket can only move one
  // rung per run even if it is wildly overdue; if it's still breached
  // after escalating, the *next* run will move it up again.
  function runEscalationCheck(){
    var escalated = [];
    state.tickets.forEach(function(t){
      if(t.status !== 'open') return;
      if(!isOverdue(t)) return;
      var next = nextPriority(t.priority);
      if(!next) return; // already at the top of the ladder
      var from = t.priority;
      t.priority = next;
      t.escalatedAt = new Date().toISOString();
      escalated.push({ id: t.id, customer: t.customer, from: from, to: next });
    });
    state.lastEscalationRun = new Date().toISOString();
    if(escalated.length){
      state.escalationLog = escalated.concat(state.escalationLog).slice(0, 20);
      save();
    }
    return escalated;
  }

  // The core ordering rule:
  // 1) Open tickets before resolved.
  // 2) Among open tickets: overdue jumps to front, regardless of priority.
  // 3) Within "overdue" and within "not overdue" groups: urgent before high before normal.
  // 4) Within each of those groups: earliest deadline first
  //    (for overdue, that means longest-breached first; for on-time, soonest-due first).
  function compareTickets(a, b){
    var aResolved = a.status === 'resolved', bResolved = b.status === 'resolved';
    if(aResolved !== bResolved) return aResolved ? 1 : -1;
    if(aResolved && bResolved){
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    var aOver = isOverdue(a), bOver = isOverdue(b);
    if(aOver !== bOver) return aOver ? -1 : 1;
    var pr = priorityRank(a.priority) - priorityRank(b.priority);
    if(pr !== 0) return pr;
    return deadline(a) - deadline(b);
  }

  function applyFilters(list){
    var q = state.query.trim().toLowerCase();
    return list.filter(function(t){
      if(q && t.customer.toLowerCase().indexOf(q) === -1 && t.subject.toLowerCase().indexOf(q) === -1) return false;
      if(state.filter === 'overdue' && !isOverdue(t)) return false;
      if(state.filter === 'mine' && t.assignee !== state.me) return false;
      if(state.priorityFilter !== 'all' && t.priority !== state.priorityFilter) return false;
      if(state.assignee !== 'all'){
        if(state.assignee === '__unassigned__' && t.assignee) return false;
        if(state.assignee !== '__unassigned__' && t.assignee !== state.assignee) return false;
      }
      return true;
    });
  }

  function fmtDuration(ms){
    var abs = Math.abs(ms);
    var mins = Math.floor(abs/60000);
    var h = Math.floor(mins/60);
    var m = mins % 60;
    if(h >= 24){
      var d = Math.floor(h/24); var rh = h % 24;
      return d + 'd ' + rh + 'h';
    }
    if(h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  function timerInfo(t){
    if(t.status === 'resolved'){
      return { label:'Resolved', text: relativeTime(t.createdAt), overdue:false };
    }
    var dl = deadline(t);
    var diff = dl - Date.now();
    if(diff < 0){
      return { label:'Overdue by', text: fmtDuration(diff), overdue:true };
    }
    return { label:'Due in', text: fmtDuration(diff), overdue:false };
  }

  function relativeTime(iso){
    var diff = Date.now() - new Date(iso).getTime();
    return fmtDuration(diff) + ' ago';
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function uniqueAssignees(){
    var set = {};
    state.tickets.forEach(function(t){ if(t.assignee) set[t.assignee] = true; });
    return Object.keys(set).sort();
  }

  // ---------- Render ----------
  function render(){
    var open = state.tickets.filter(function(t){ return t.status === 'open'; });
    var overdueCount = open.filter(isOverdue).length;
    var mineCount = open.filter(function(t){ return t.assignee === state.me; }).length;

    var sorted = state.tickets.slice().sort(compareTickets);
    var filtered = applyFilters(sorted);

    var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if(state.page > totalPages) state.page = totalPages;
    var startIdx = (state.page - 1) * PAGE_SIZE;
    var pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    var assignees = uniqueAssignees();

    var html = '';
    html += '<div class="top">';
    html += '  <div>';
    html += '    <h1>Helpdesk queue</h1>';
    html += '    <div class="sub">Most pressing ticket first. Overdue tickets always jump to the top.</div>';
    html += '  </div>';
    html += '  <div class="clock"><span class="now-time mono">' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '</span><br>' + new Date().toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'}) + '</div>';
    html += '</div>';

    html += '<div class="stats">';
    html += statBlock('all', open.length, 'Open tickets', false);
    html += statBlock('overdue', overdueCount, 'Overdue', true);
    html += statBlock('mine', mineCount, 'Assigned to ' + state.me, false);
    html += statBlock('resolved-view', state.tickets.filter(function(t){return t.status==='resolved';}).length, 'Resolved', false);
    html += '</div>';

    html += '<div class="escalation-bar">';
    html += '  <div class="escalation-info">';
    html += '    <span class="escalation-dot"></span>';
    html += '    Automated escalation check ' + (state.lastEscalationRun ? 'last ran <span class="mono">' + relativeTime(state.lastEscalationRun) + '</span>' : 'hasn\'t run yet') + ' · next run in <span class="mono" id="nextRunIn">…</span>';
    html += '  </div>';
    html += '  <button class="btn btn-ghost" id="runEscalationBtn">Run check now</button>';
    html += '</div>';

    html += '<div class="controls">';
    html += '  <div class="search-wrap">';
    html += '    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    html += '    <input id="search" type="text" placeholder="Search by customer or subject…" value="' + escapeHtml(state.query) + '">';
    html += '  </div>';
    html += '  <select id="priorityFilter">';
    html += '    <option value="all"' + (state.priorityFilter==='all'?' selected':'') + '>All priorities</option>';
    html += '    <option value="urgent"' + (state.priorityFilter==='urgent'?' selected':'') + '>Urgent</option>';
    html += '    <option value="high"' + (state.priorityFilter==='high'?' selected':'') + '>High</option>';
    html += '    <option value="normal"' + (state.priorityFilter==='normal'?' selected':'') + '>Normal</option>';
    html += '  </select>';
    html += '  <select id="assigneeFilter">';
    html += '    <option value="all"' + (state.assignee==='all'?' selected':'') + '>Everyone</option>';
    html += '    <option value="__unassigned__"' + (state.assignee==='__unassigned__'?' selected':'') + '>Unassigned</option>';
    assignees.forEach(function(a){
      html += '<option value="' + escapeHtml(a) + '"' + (state.assignee===a?' selected':'') + '>' + escapeHtml(a) + '</option>';
    });
    html += '  </select>';
    html += '  <button class="btn btn-primary" id="newTicketBtn">+ New ticket</button>';
    html += '</div>';

    html += '<div class="queue">';
    if(pageItems.length === 0){
      html += '<div class="empty"><div class="big">Nothing here</div>Try a different filter or search term.</div>';
    } else {
      pageItems.forEach(function(t){
        var globalRank = filtered.indexOf(t) + 1;
        var over = isOverdue(t);
        var resolved = t.status === 'resolved';
        var tm = timerInfo(t);
        var stripeClass = resolved ? 'resolved' : (over ? 'overdue' : t.priority);
        var isTop = filtered[0] && filtered[0].id === t.id && !resolved && state.query==='' && state.filter==='all' && state.priorityFilter==='all' && state.assignee==='all';

        html += '<div class="row' + (isTop ? ' top-pick' : '') + '" data-id="' + t.id + '">';
        html += '  <div class="stripe ' + stripeClass + '"></div>';
        html += '  <div class="rank">' + (resolved ? '✓' : '#' + globalRank) + '</div>';
        html += '  <div class="main-cell">';
        html += '    <div class="subject">' + escapeHtml(t.subject) + '</div>';
        html += '    <div class="meta-line">' + escapeHtml(t.customer) + '<span class="sep">·</span><span class="ticket-id">' + t.id + '</span></div>';
        html += '  </div>';
        html += '  <div class="badge-cell">';
        if(resolved){
          html += '<span class="badge resolved"><span class="dot"></span>Resolved</span>';
        } else if(over){
          html += '<span class="badge overdue"><span class="dot"></span>Overdue</span>';
        } else {
          html += '<span class="badge ' + t.priority + '"><span class="dot"></span>' + priorityDisplay(t.priority) + '</span>';
        }
        if(t.escalatedAt){
          html += '<span class="escalated-tag" title="Auto-escalated by the SLA check">&#8593; escalated</span>';
        }
        html += '  </div>';
        html += '  <div class="timer' + (tm.overdue ? ' is-overdue' : '') + '"><span class="lbl">' + tm.label + '</span>' + tm.text + '</div>';
        html += '  <div class="assignee">' + (t.assignee ? '<span class="chip-a">' + escapeHtml(t.assignee) + '</span>' : '<span class="unassigned">Unassigned</span>') + '</div>';
        html += '  <div class="row-actions">';
        if(!resolved){
          html += '<button class="icon-btn" title="Mark resolved" data-action="resolve" data-id="' + t.id + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>';
        } else {
          html += '<button class="icon-btn" title="Reopen" data-action="reopen" data-id="' + t.id + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>';
        }
        html += '<button class="icon-btn" title="Delete" data-action="delete" data-id="' + t.id + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>';
        html += '  </div>';
        html += '</div>';
      });
    }
    html += '</div>';

    html += '<div class="pager">';
    html += '  <div>' + filtered.length + ' ticket' + (filtered.length===1?'':'s') + (filtered.length !== state.tickets.length ? ' (filtered)' : '') + '</div>';
    html += '  <div class="pages">';
    html += '<button data-page="prev" ' + (state.page<=1?'disabled':'') + '>‹</button>';
    for(var p=1; p<=totalPages; p++){
      if(totalPages > 7 && Math.abs(p-state.page) > 2 && p!==1 && p!==totalPages){
        if(p === 2 || p === totalPages-1) html += '<span style="padding:0 4px;">…</span>';
        continue;
      }
      html += '<button data-page="' + p + '" class="' + (p===state.page?'active':'') + '">' + p + '</button>';
    }
    html += '<button data-page="next" ' + (state.page>=totalPages?'disabled':'') + '>›</button>';
    html += '  </div>';
    html += '</div>';

    document.getElementById('app').innerHTML = html;
    bindEvents(assignees);
  }

  function statBlock(key, n, label, isOverdueStat){
    var active = state.filter === key || (key==='resolved-view' && false);
    var cls = 'stat' + (isOverdueStat ? ' n-overdue' : '') + (active ? ' active' : '');
    var clickable = (key === 'all' || key === 'overdue' || key === 'mine');
    return '<div class="' + cls + '"' + (clickable ? ' data-filter="' + key + '"' : '') + '>' +
      '<div class="n">' + n + '</div><div class="lbl">' + label + '</div></div>';
  }

  function bindEvents(assignees){
    var search = document.getElementById('search');
    if(search){
      search.addEventListener('input', function(e){
        state.query = e.target.value;
        state.page = 1;
        render();
        var el = document.getElementById('search');
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    }
    var pf = document.getElementById('priorityFilter');
    if(pf) pf.addEventListener('change', function(e){ state.priorityFilter = e.target.value; state.page=1; render(); });
    var af = document.getElementById('assigneeFilter');
    if(af) af.addEventListener('change', function(e){ state.assignee = e.target.value; state.page=1; render(); });

    document.querySelectorAll('[data-filter]').forEach(function(el){
      el.addEventListener('click', function(){
        var f = el.getAttribute('data-filter');
        state.filter = (state.filter === f) ? 'all' : f;
        state.page = 1;
        render();
      });
    });

    document.querySelectorAll('[data-action="resolve"]').forEach(function(el){
      el.addEventListener('click', function(){ setStatus(el.getAttribute('data-id'), 'resolved'); });
    });
    document.querySelectorAll('[data-action="reopen"]').forEach(function(el){
      el.addEventListener('click', function(){ setStatus(el.getAttribute('data-id'), 'open'); });
    });
    document.querySelectorAll('[data-action="delete"]').forEach(function(el){
      el.addEventListener('click', function(){
        var id = el.getAttribute('data-id');
        state.tickets = state.tickets.filter(function(t){ return t.id !== id; });
        save(); render();
      });
    });

    document.querySelectorAll('.pager [data-page]').forEach(function(el){
      el.addEventListener('click', function(){
        var v = el.getAttribute('data-page');
        if(v === 'prev') state.page = Math.max(1, state.page-1);
        else if(v === 'next') state.page = state.page+1;
        else state.page = parseInt(v,10);
        render();
      });
    });

    var newBtn = document.getElementById('newTicketBtn');
    if(newBtn) newBtn.addEventListener('click', function(){ openModal(assignees); });

    var runBtn = document.getElementById('runEscalationBtn');
    if(runBtn) runBtn.addEventListener('click', function(){
      var escalated = runEscalationCheck();
      render();
      showEscalationToast(escalated);
    });
  }

  // ---------- Escalation toast ----------
  function showEscalationToast(escalated){
    var existing = document.getElementById('escalationToast');
    if(existing) existing.remove();
    if(!escalated || !escalated.length) return;
    var box = document.createElement('div');
    box.id = 'escalationToast';
    box.className = 'toast';
    var lines = escalated.map(function(e){
      return '<div class="toast-line"><span class="mono">' + e.id + '</span> — ' + escapeHtml(e.customer) + ': ' +
        priorityDisplay(e.from) + ' <span class="toast-arrow">&rarr;</span> ' + priorityDisplay(e.to) + '</div>';
    }).join('');
    box.innerHTML =
      '<div class="toast-head">Escalation check ran — ' + escalated.length + ' ticket' + (escalated.length===1?'':'s') + ' bumped up</div>' +
      lines;
    document.body.appendChild(box);
    setTimeout(function(){
      var el = document.getElementById('escalationToast');
      if(el) el.remove();
    }, 6000);
  }

  function setStatus(id, status){
    var t = state.tickets.find(function(t){ return t.id === id; });
    if(t) t.status = status;
    save(); render();
  }

  function openModal(assignees){
    var wrap = document.createElement('div');
    wrap.className = 'overlay';
    wrap.id = 'overlay';
    wrap.innerHTML =
      '<div class="modal">' +
      '  <h2>New ticket</h2>' +
      '  <div class="modal-sub">It will slot into the queue based on priority and SLA.</div>' +
      '  <div class="field"><label>Customer name</label><input id="f_customer" type="text" placeholder="Jordan Lee"></div>' +
      '  <div class="field"><label>Subject</label><input id="f_subject" type="text" placeholder="What\'s the issue?"></div>' +
      '  <div class="field"><label>Priority — response time</label>' +
      '    <div class="priority-choice">' +
      '      <label><input type="radio" name="f_priority" value="urgent" checked><span>Urgent · 2h</span></label>' +
      '      <label><input type="radio" name="f_priority" value="high"><span>High · 8h</span></label>' +
      '      <label><input type="radio" name="f_priority" value="normal"><span>Normal · 1 day</span></label>' +
      '    </div>' +
      '  </div>' +
      '  <div class="field"><label>Assignee (optional)</label><input id="f_assignee" list="assignee_list" type="text" placeholder="Leave blank to unassign"><datalist id="assignee_list">' + assignees.map(function(a){return '<option value="'+escapeHtml(a)+'">';}).join('') + '</datalist></div>' +
      '  <div class="modal-actions">' +
      '    <button class="btn" id="cancelModal">Cancel</button>' +
      '    <button class="btn btn-primary" id="saveModal">Add ticket</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(wrap);
    document.getElementById('f_customer').focus();

    wrap.addEventListener('click', function(e){ if(e.target === wrap) closeModal(); });
    document.getElementById('cancelModal').addEventListener('click', closeModal);
    document.getElementById('saveModal').addEventListener('click', function(){
      var customer = document.getElementById('f_customer').value.trim();
      var subject = document.getElementById('f_subject').value.trim();
      var priority = document.querySelector('input[name="f_priority"]:checked').value;
      var assignee = document.getElementById('f_assignee').value.trim();
      if(!customer || !subject){
        document.getElementById('f_customer').style.borderColor = customer ? '' : 'var(--overdue)';
        document.getElementById('f_subject').style.borderColor = subject ? '' : 'var(--overdue)';
        return;
      }
      state.tickets.unshift({
        id: uid(), customer: customer, subject: subject, priority: priority,
        assignee: assignee, createdAt: new Date().toISOString(), status: 'open'
      });
      save();
      closeModal();
      state.page = 1;
      render();
    });
  }
  function closeModal(){
    var el = document.getElementById('overlay');
    if(el) el.remove();
  }

  // Keeps the "next run in Xs" text ticking without a full re-render.
  var nextRunAt = 0;
  function tickNextRunLabel(){
    var el = document.getElementById('nextRunIn');
    if(!el) return;
    var secs = Math.max(0, Math.round((nextRunAt - Date.now()) / 1000));
    el.textContent = secs + 's';
  }

  function scheduleEscalation(){
    nextRunAt = Date.now() + ESCALATION_INTERVAL_MS;
    setInterval(function(){
      var escalated = runEscalationCheck();
      nextRunAt = Date.now() + ESCALATION_INTERVAL_MS;
      render();
      if(escalated.length) showEscalationToast(escalated);
    }, ESCALATION_INTERVAL_MS);
    setInterval(tickNextRunLabel, 1000);
  }

  load();
  // Run the escalation check once immediately on load, so any ticket that
  // was already breached before the page opened gets escalated right away
  // — not just from the next scheduled run onward.
  var initialEscalated = runEscalationCheck();
  render();
  if(initialEscalated.length) showEscalationToast(initialEscalated);
  scheduleEscalation();
  setInterval(render, 30000);

  // Exposed for manual testing / an automated grading script, e.g. from
  // the browser console: window.helpdeskQueue.runEscalationCheck()
  window.helpdeskQueue = {
    runEscalationCheck: function(){ var r = runEscalationCheck(); render(); return r; },
    getTickets: function(){ return state.tickets.slice(); }
  };
})();
