import { ApiError, clearSession, clone, commit, delay, fail, getDb, getSession, newId, nextMessageSeq, nowIso, resetDb, setSession } from "./db";

/*
 * Data facade. Every method mirrors one backend endpoint (same inputs, same response shapes, same
 * business rules and error messages) so the UI never needs to know where the data comes from.
 * Lists resolve to { data, total, pages }.
 */

const FILE_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "text/plain", "application/zip",
  "application/x-zip-compressed", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const FILE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "pdf", "txt", "zip", "doc", "docx", "xlsx"];
const MAX_FILE = 10 * 1024 * 1024;
const MAX_FILES = 10;
const blobs = new Map();

// ------------------------------------------------------------------ helpers

const D = () => getDb();
const ref = (id) => {
  const u = D().users.find((x) => x._id === id);
  return u ? { _id: u._id, name: u.name } : null;
};
const nameOf = (id) => D().users.find((x) => x._id === id)?.name || "Someone";
const trim = (s) => (typeof s === "string" && s.trim() ? s.trim() : null);
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function cleanList(list, maxItems, maxLen) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    let t = trim(raw);
    if (!t) continue;
    if (t.length > maxLen) t = t.slice(0, maxLen);
    if (!seen.has(t.toLowerCase()) && out.length < maxItems) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out;
}

function paged(list, { page = 0, size = 50 } = {}) {
  const s = Math.min(Math.max(Number(size) || 50, 1), 100);
  const p = Math.max(Number(page) || 0, 0);
  return { data: clone(list.slice(p * s, p * s + s)), total: list.length, pages: Math.max(1, Math.ceil(list.length / s)) };
}

function current() {
  const session = getSession();
  const u = session && D().users.find((x) => x._id === session.userId);
  if (!u) fail(401, "Access denied");
  return u;
}

const requireRole = (u, role, message) => {
  if (u.role !== role) fail(403, message);
};

function notify(userId, type, message, taskId = null) {
  if (!userId) return;
  D().notifications.push({ _id: newId("n"), user: userId, type, message, task: taskId, read: false, createdAt: nowIso() });
}

function notifyAdmins(type, message, taskId) {
  D().users.filter((u) => u.role === "admin").forEach((a) => notify(a._id, type, message, taskId));
}

function audit(actor, action, targetType, targetId, details = null) {
  D().audit.push({ _id: newId("a"), actor, action, targetType, targetId, details, createdAt: nowIso() });
}

const isBlocked = (a, b) => D().blocks.some((x) => (x.blocker === a && x.blocked === b) || (x.blocker === b && x.blocked === a));

const fileView = (id) => {
  const f = D().files.find((x) => x._id === id);
  return f ? { _id: f._id, name: f.name, contentType: f.contentType, size: f.size } : null;
};

function taskView(t) {
  return clone({
    _id: t._id,
    title: t.title,
    description: t.description,
    price: t.price,
    agreedPrice: t.agreedPrice ?? null,
    location: t.location ?? null,
    category: t.category ?? null,
    skills: t.skills || [],
    deadline: t.deadline ?? null,
    latitude: t.latitude ?? null,
    longitude: t.longitude ?? null,
    status: t.status,
    employer: ref(t.employer),
    freelancer: ref(t.freelancer),
    attachments: (t.attachments || []).map(fileView).filter(Boolean),
    deliverables: (t.deliverables || []).map(fileView).filter(Boolean),
    submissionNote: t.submissionNote ?? null,
    revisionNote: t.revisionNote ?? null,
    cancelReason: t.cancelReason ?? null,
    hidden: !!t.hidden,
    submittedAt: t.submittedAt ?? null,
    completedAt: t.completedAt ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  });
}

const userView = (u) =>
  clone({
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    emailVerified: u.emailVerified,
    bio: u.bio || null,
    avatarUrl: u.avatarUrl || null,
    skills: u.skills || [],
    hourlyRate: u.hourlyRate ?? null,
    location: u.location || null,
    portfolio: u.portfolio || [],
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  });

const publicUser = (u) => {
  const { _id, name, role, bio, avatarUrl, skills, hourlyRate, location, portfolio } = userView(u);
  return { _id, name, role, bio, avatarUrl, skills, hourlyRate, location, portfolio };
};

function ratingView(r) {
  return clone({
    _id: r._id,
    from: ref(r.from),
    to: r.to,
    task: r.task,
    score: r.score,
    comment: r.comment ?? null,
    reply: r.reply ?? null,
    repliedAt: r.repliedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });
}

function proposalView(p) {
  const t = D().tasks.find((x) => x._id === p.task);
  return clone({
    _id: p._id,
    taskId: p.task,
    taskTitle: t?.title ?? null,
    freelancer: ref(p.freelancer),
    price: p.price,
    message: p.message,
    etaDays: p.etaDays ?? null,
    status: p.status,
    createdAt: p.createdAt,
  });
}

function disputeView(d) {
  const t = D().tasks.find((x) => x._id === d.task);
  return clone({
    _id: d._id,
    taskId: d.task,
    taskTitle: t?.title ?? null,
    openedBy: ref(d.openedBy),
    against: ref(d.against),
    reason: d.reason,
    status: d.status,
    outcome: d.outcome,
    resolutionNote: d.resolutionNote ?? null,
    resolvedAt: d.resolvedAt ?? null,
    createdAt: d.createdAt,
  });
}

const isEmployer = (u, t) => u._id === t.employer;
const isAssignee = (u, t) => !!t.freelancer && u._id === t.freelancer;
const isParticipant = (u, t) => isEmployer(u, t) || isAssignee(u, t);

function getTask(id) {
  const t = D().tasks.find((x) => x._id === id);
  if (!t) fail(404, "Task not found");
  return t;
}

function touch(t) {
  t.updatedAt = nowIso();
}

const sortTasks = (list, sort) => {
  const by = {
    oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    deadline: (a, b) => (a.deadline ? new Date(a.deadline).getTime() : Infinity) - (b.deadline ? new Date(b.deadline).getTime() : Infinity),
  }[sort] || ((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return [...list].sort(by);
};

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function claimFiles(userId, ids) {
  const list = [...new Set(ids || [])];
  if (list.length > MAX_FILES) fail(400, `Too many files (max ${MAX_FILES})`);
  return list.map((id) => {
    const f = D().files.find((x) => x._id === id);
    if (!f) fail(400, `File not found: ${id}`);
    if (f.owner !== userId) fail(403, "You can only attach your own files");
    if (f.task) fail(400, "File is already attached to a task");
    return f;
  });
}

function linkFiles(files, taskId, kind) {
  files.forEach((f) => {
    f.task = taskId;
    f.kind = kind;
  });
}

function closePending(task, exceptId, type, message) {
  D().proposals
    .filter((p) => p.task === task._id && p.status === "pending" && p._id !== exceptId)
    .forEach((p) => {
      p.status = "rejected";
      notify(p.freelancer, type, message, task._id);
    });
}

function assignTask(taskId, freelancerId, agreedPrice) {
  const t = D().tasks.find((x) => x._id === taskId);
  if (!t || t.status !== "open" || t.hidden) return null;
  t.status = "assigned";
  t.freelancer = freelancerId;
  t.agreedPrice = agreedPrice;
  touch(t);
  return t;
}

const average = (list) => (list.length ? (list.reduce((s, r) => s + r.score, 0) / list.length).toFixed(1) : null);

const sortNewest = (list) => [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

// ------------------------------------------------------------------ simulated activity

const REPLIES = [
  "Sounds good to me.",
  "Thanks for the update. That works.",
  "Perfect, let me know if you need anything from my side.",
  "Great, I will check it first thing in the morning.",
  "Happy with that. Let us go with it.",
  "Understood, thank you!",
];

function simulateReply(taskId, fromId, toId) {
  setTimeout(() => {
    const t = D().tasks.find((x) => x._id === taskId);
    if (!t || !["assigned", "submitted", "completed"].includes(t.status)) return;
    D().messages.push({
      _id: newId("m"),
      seq: nextMessageSeq(),
      task: taskId,
      sender: fromId,
      recipient: toId,
      text: pick(REPLIES),
      readAt: null,
      createdAt: nowIso(),
    });
    commit();
  }, rand(2200, 4200));
}

function simulateProposal(taskId) {
  setTimeout(() => {
    const t = D().tasks.find((x) => x._id === taskId);
    if (!t || t.status !== "open") return;
    const candidates = D().users.filter(
      (u) => u.role === "freelancer" && u.status === "active" && !D().proposals.some((p) => p.task === taskId && p.freelancer === u._id)
    );
    const matching = candidates.filter((u) => (u.skills || []).some((s) => (t.skills || []).map((x) => x.toLowerCase()).includes(s.toLowerCase())));
    const who = pick(matching.length ? matching : candidates);
    if (!who || isBlocked(who._id, t.employer)) return;
    D().proposals.push({
      _id: newId("p"),
      task: taskId,
      freelancer: who._id,
      price: Math.max(5, Math.round(t.price * rand(0.8, 0.96))),
      message: "This is right in my wheelhouse. I can start soon and keep you posted along the way.",
      etaDays: Math.ceil(rand(1, 4)),
      status: "pending",
      createdAt: nowIso(),
    });
    notify(t.employer, "proposal_received", `${who.name} sent a proposal for "${t.title}"`, taskId);
    commit();
  }, rand(6000, 9000));
}

// ------------------------------------------------------------------ auth

const auth = {
  async register({ name, email, password, role }) {
    await delay();
    if (!name?.trim() || !email?.trim() || !password) fail(400, "Name, email and password are required");
    if (password.length < 6) fail(400, "Password must be between 6 and 100 characters");
    if (!["freelancer", "employer"].includes(role)) fail(400, "A valid role is required");
    if (D().users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) fail(400, "Email already in use");
    const user = {
      _id: newId("u"),
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      status: "active",
      emailVerified: false,
      bio: "",
      avatarUrl: "",
      skills: [],
      hourlyRate: null,
      location: "",
      portfolio: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    D().users.push(user);
    commit();
    return { message: "User registered" };
  },

  async login({ email, password }) {
    await delay();
    const user = D().users.find((u) => u.email.toLowerCase() === (email || "").trim().toLowerCase());
    if (!user) fail(400, "User not found");
    if (user.password !== password) fail(400, "Invalid credentials");
    if (user.status === "suspended") fail(403, "Account suspended");
    setSession({ userId: user._id });
    return { token: `session.${user._id}`, refreshToken: `refresh.${user._id}`, user: { id: user._id, _id: user._id, name: user.name, role: user.role } };
  },

  async logout() {
    await delay(60);
    clearSession();
    return { message: "Logged out" };
  },

  async logoutAll() {
    await delay();
    return { message: "Logged out of all devices" };
  },

  async forgotPassword(email) {
    await delay();
    const user = D().users.find((u) => u.email.toLowerCase() === (email || "").trim().toLowerCase());
    if (user) {
      const token = Math.random().toString(36).slice(2, 10);
      D().tokens = D().tokens.filter((t) => !(t.user === user._id && t.type === "password_reset"));
      D().tokens.push({ user: user._id, type: "password_reset", token, expiresAt: Date.now() + 3600e3 });
      commit();
      console.info(`[dev] password reset token for ${user.email}: ${token}`);
    }
    return { message: "If that email exists, a reset token has been issued" };
  },

  async resetPassword({ token, password }) {
    await delay();
    if (!password || password.length < 6) fail(400, "Password must be between 6 and 100 characters");
    const t = D().tokens.find((x) => x.type === "password_reset" && x.token === token && x.expiresAt > Date.now());
    if (!t) fail(400, "Invalid or expired token");
    const user = D().users.find((u) => u._id === t.user);
    user.password = password;
    D().tokens = D().tokens.filter((x) => x !== t);
    commit();
    return { message: "Password updated" };
  },

  async verifyEmail(token) {
    await delay();
    const t = D().tokens.find((x) => x.type === "email_verification" && x.token === token && x.expiresAt > Date.now());
    if (!t) fail(400, "Invalid or expired token");
    D().users.find((u) => u._id === t.user).emailVerified = true;
    D().tokens = D().tokens.filter((x) => x !== t);
    commit();
    return { message: "Email verified" };
  },

  async resendVerification() {
    await delay();
    const u = current();
    if (u.emailVerified) fail(400, "Email already verified");
    const token = Math.random().toString(36).slice(2, 10);
    D().tokens = D().tokens.filter((t) => !(t.user === u._id && t.type === "email_verification"));
    D().tokens.push({ user: u._id, type: "email_verification", token, expiresAt: Date.now() + 2 * 86400e3 });
    commit();
    console.info(`[dev] email verification token for ${u.email}: ${token}`);
    return { message: "Verification token issued" };
  },

  hasSession() {
    const s = getSession();
    return !!(s && D().users.some((u) => u._id === s.userId));
  },

  resetAll() {
    resetDb();
  },
};

// ------------------------------------------------------------------ users

const users = {
  async me() {
    await delay();
    const u = current();
    const mine =
      u.role === "freelancer"
        ? D().tasks.filter((t) => t.freelancer === u._id)
        : u.role === "employer"
          ? D().tasks.filter((t) => t.employer === u._id)
          : [];
    const received = D().ratings.filter((r) => r.to === u._id);
    return {
      user: userView(u),
      stats: {
        totalTasks: mine.length,
        completedTasks: mine.filter((t) => t.status === "completed").length,
        avgRating: average(received),
        totalRatings: received.length,
      },
    };
  },

  async updateMe(body) {
    await delay();
    const u = current();
    if (trim(body.name)) u.name = body.name.trim();
    if (body.bio !== undefined && body.bio !== null) {
      if (body.bio.length > 1000) fail(400, "Bio is too long");
      u.bio = trim(body.bio) || "";
    }
    if (body.avatarUrl !== undefined && body.avatarUrl !== null) {
      const url = trim(body.avatarUrl);
      if (url && !/^https?:\/\/\S+$/i.test(url)) fail(400, "Avatar url must start with http:// or https://");
      u.avatarUrl = url || "";
    }
    if (body.skills) u.skills = cleanList(body.skills, 30, 40);
    if (body.hourlyRate !== undefined && body.hourlyRate !== null && body.hourlyRate !== "") {
      if (Number(body.hourlyRate) < 0) fail(400, "Hourly rate cannot be negative");
      u.hourlyRate = Number(body.hourlyRate);
    }
    if (body.location !== undefined && body.location !== null) u.location = trim(body.location) || "";
    if (body.portfolio) {
      body.portfolio.forEach((p) => {
        if (!trim(p.title)) fail(400, "Portfolio title is required");
        if (trim(p.url) && !/^https?:\/\/\S+$/i.test(p.url.trim())) fail(400, "Portfolio url must start with http:// or https://");
      });
      u.portfolio = body.portfolio.slice(0, 20).map((p) => ({ title: p.title.trim(), url: trim(p.url) || "", description: trim(p.description) || "" }));
    }
    if (trim(body.password)) {
      if (body.password.length < 6) fail(400, "Password must be between 6 and 100 characters");
      u.password = body.password;
    }
    u.updatedAt = nowIso();
    commit();
    return userView(u);
  },

  async publicProfile(id) {
    await delay();
    const u = D().users.find((x) => x._id === id);
    if (!u) fail(404, "User not found");
    const received = sortNewest(D().ratings.filter((r) => r.to === id));
    const done = sortNewest(
      D().tasks.filter((t) => t.status === "completed" && !t.hidden && (u.role === "freelancer" ? t.freelancer === id : t.employer === id))
    ).slice(0, 5);
    return {
      user: publicUser(u),
      avgRating: average(received),
      totalRatings: received.length,
      recentRatings: received.slice(0, 5).map((r) => ({ score: r.score, comment: r.comment, from: nameOf(r.from) })),
      completedTasks: done.map(taskView),
    };
  },

  async block(id) {
    await delay();
    const me = current();
    if (id === me._id) fail(400, "You cannot block yourself");
    if (!D().users.some((u) => u._id === id)) fail(404, "User not found");
    if (!D().blocks.some((b) => b.blocker === me._id && b.blocked === id)) D().blocks.push({ blocker: me._id, blocked: id, createdAt: nowIso() });
    commit();
    return { message: "User blocked" };
  },

  async unblock(id) {
    await delay();
    const me = current();
    D().blocks = D().blocks.filter((b) => !(b.blocker === me._id && b.blocked === id));
    commit();
    return { message: "User unblocked" };
  },

  async blocks() {
    await delay();
    const me = current();
    return D().blocks.filter((b) => b.blocker === me._id).map((b) => ref(b.blocked)).filter(Boolean);
  },
};

// ------------------------------------------------------------------ tasks

function validateTaskInput(body) {
  if (!trim(body.title)) fail(400, "Title is required");
  if (!trim(body.description)) fail(400, "Description is required");
  if (body.price === "" || body.price == null || Number.isNaN(Number(body.price))) fail(400, "A valid price is required");
  if (Number(body.price) < 0) fail(400, "Price cannot be negative");
  if (body.deadline && new Date(body.deadline).getTime() < Date.now()) fail(400, "Deadline must be in the future");
  const hasLat = body.latitude !== null && body.latitude !== undefined && body.latitude !== "";
  const hasLng = body.longitude !== null && body.longitude !== undefined && body.longitude !== "";
  if (hasLat !== hasLng) fail(400, "Both latitude and longitude are required");
  if (hasLat && (Math.abs(body.latitude) > 90 || Math.abs(body.longitude) > 180)) fail(400, "Latitude or longitude is out of range");
}

function applyTaskFields(t, body) {
  t.title = body.title.trim();
  t.description = body.description.trim();
  t.price = Number(body.price);
  t.location = trim(body.location);
  t.category = trim(body.category);
  t.skills = cleanList(body.skills, 15, 40);
  t.deadline = body.deadline ? new Date(body.deadline).toISOString() : null;
  const has = body.latitude !== null && body.latitude !== undefined && body.latitude !== "";
  t.latitude = has ? Number(body.latitude) : null;
  t.longitude = has ? Number(body.longitude) : null;
}

const tasks = {
  async create(body) {
    await delay();
    const me = current();
    requireRole(me, "employer", "Only employers can post tasks");
    validateTaskInput(body);
    const files = claimFiles(me._id, body.attachmentIds);
    const t = { _id: newId("t"), status: "open", employer: me._id, freelancer: null, agreedPrice: null, attachments: [], deliverables: [], hidden: false, createdAt: nowIso(), updatedAt: nowIso() };
    applyTaskFields(t, body);
    D().tasks.push(t);
    linkFiles(files, t._id, "attachment");
    t.attachments = files.map((f) => f._id);
    commit();
    simulateProposal(t._id);
    return taskView(t);
  },

  async update(id, body) {
    await delay();
    const me = current();
    const t = getTask(id);
    if (!isEmployer(me, t)) fail(403, "Only the employer who posted this task can do that");
    if (t.status !== "open") fail(400, "Only open tasks can be edited");
    validateTaskInput(body);
    applyTaskFields(t, body);
    if (body.attachmentIds) {
      const wanted = [...new Set(body.attachmentIds)];
      if (wanted.length > MAX_FILES) fail(400, `Too many files (max ${MAX_FILES})`);
      const added = claimFiles(me._id, wanted.filter((f) => !t.attachments.includes(f)));
      linkFiles(added, t._id, "attachment");
      D().files = D().files.filter((f) => !(t.attachments.includes(f._id) && !wanted.includes(f._id)));
      t.attachments = wanted;
    }
    touch(t);
    commit();
    return taskView(t);
  },

  async remove(id) {
    await delay();
    const me = current();
    const t = getTask(id);
    if (!isEmployer(me, t)) fail(403, "Only the employer who posted this task can do that");
    if (t.status !== "open") fail(400, "Only open tasks can be deleted; cancel the task instead");
    closePending(t, null, "task_cancelled", `The task "${t.title}" was removed by the employer`);
    D().proposals = D().proposals.filter((p) => p.task !== id);
    D().favorites = D().favorites.filter((f) => f.task !== id);
    D().files = D().files.filter((f) => f.task !== id);
    D().tasks = D().tasks.filter((x) => x._id !== id);
    audit(me._id, "task.delete", "task", id, t.title);
    commit();
    return { message: "Task deleted" };
  },

  async get(id) {
    await delay();
    const me = current();
    const t = getTask(id);
    if (t.hidden && !isParticipant(me, t) && me.role !== "admin") fail(404, "Task not found");
    return taskView(t);
  },

  async search(f = {}) {
    await delay();
    current();
    const now = Date.now();
    let list = D().tasks.filter((t) => t.status === "open" && !t.hidden && (!t.deadline || new Date(t.deadline).getTime() > now));
    const ci = (a, b) => (a || "").toLowerCase().includes((b || "").toLowerCase());
    if (trim(f.location)) list = list.filter((t) => ci(t.location, f.location.trim()));
    if (trim(f.category)) list = list.filter((t) => (t.category || "").toLowerCase() === f.category.trim().toLowerCase());
    const skills = cleanList(typeof f.skills === "string" ? f.skills.split(",") : f.skills, 15, 40).map((s) => s.toLowerCase());
    if (skills.length) list = list.filter((t) => (t.skills || []).some((s) => skills.includes(s.toLowerCase())));
    if (trim(f.q)) {
      const q = f.q.trim();
      list = list.filter((t) => ci(t.title, q) || ci(t.description, q) || ci(t.category, q) || (t.skills || []).some((s) => ci(s, q)));
    }
    if (f.minPrice !== "" && f.minPrice != null) list = list.filter((t) => t.price >= Number(f.minPrice));
    if (f.maxPrice !== "" && f.maxPrice != null) list = list.filter((t) => t.price <= Number(f.maxPrice));
    const hasLat = f.lat !== undefined && f.lat !== null && f.lat !== "";
    const hasLng = f.lng !== undefined && f.lng !== null && f.lng !== "";
    if (hasLat || hasLng) {
      if (!hasLat || !hasLng) fail(400, "Both latitude and longitude are required for a location search");
      const radius = f.radiusKm ? Number(f.radiusKm) : 25;
      list = list.filter((t) => t.latitude != null && haversine(Number(f.lat), Number(f.lng), t.latitude, t.longitude) <= radius);
    }
    const sorted = sortTasks(list, f.sort);
    const result = paged(sorted, f);
    return { ...result, data: result.data.map((t) => taskView(t)) };
  },

  async posted({ status, sort, page, size } = {}) {
    await delay();
    const me = current();
    requireRole(me, "employer", "Access denied");
    let list = D().tasks.filter((t) => t.employer === me._id);
    if (status) list = list.filter((t) => t.status === status);
    const r = paged(sortTasks(list, sort), { page, size });
    return { ...r, data: r.data.map(taskView) };
  },

  async assigned({ status, sort, page, size } = {}) {
    await delay();
    const me = current();
    requireRole(me, "freelancer", "Access denied");
    let list = D().tasks.filter((t) => t.freelancer === me._id);
    if (status) list = list.filter((t) => t.status === status);
    const r = paged(sortTasks(list, sort), { page, size });
    return { ...r, data: r.data.map(taskView) };
  },

  async accept(id) {
    await delay();
    const me = current();
    requireRole(me, "freelancer", "Only freelancers can accept tasks");
    const t = getTask(id);
    if (t.hidden) fail(404, "Task not found");
    if (isBlocked(me._id, t.employer)) fail(403, "You cannot accept this task");
    if (["cancelled", "expired"].includes(t.status)) fail(400, "Task is no longer available");
    if (t.status !== "open") fail(400, "Task already assigned");
    if (t.deadline && new Date(t.deadline).getTime() < Date.now()) fail(400, "Task has expired");
    const assigned = assignTask(id, me._id, t.price);
    if (!assigned) fail(400, "Task already assigned");
    const mine = D().proposals.find((p) => p.task === id && p.freelancer === me._id && p.status === "pending");
    if (mine) mine.status = "accepted";
    closePending(assigned, null, "proposal_rejected", `The task "${assigned.title}" has been taken by another freelancer`);
    notify(assigned.employer, "task_accepted", `${me.name} accepted your task "${assigned.title}"`, id);
    commit();
    return { message: "Task accepted", task: taskView(assigned) };
  },

  async withdraw(id) {
    await delay();
    const me = current();
    const t = getTask(id);
    if (!isAssignee(me, t)) fail(403, "Only the assigned freelancer can withdraw");
    if (t.status !== "assigned") fail(400, "You can only withdraw from a task that is in progress");
    D().proposals.filter((p) => p.task === id && p.freelancer === me._id && p.status === "accepted").forEach((p) => (p.status = "withdrawn"));
    t.status = "open";
    t.freelancer = null;
    t.agreedPrice = null;
    t.revisionNote = null;
    t.submissionNote = null;
    touch(t);
    notify(t.employer, "task_withdrawn", `${me.name} withdrew from your task "${t.title}"; it is open again`, id);
    audit(me._id, "task.withdraw", "task", id);
    commit();
    return taskView(t);
  },

  async submit(id, body = {}) {
    await delay();
    const me = current();
    const t = getTask(id);
    if (!isAssignee(me, t)) fail(403, "Only the assigned freelancer can submit work");
    if (t.status !== "assigned") fail(400, "Task is not in progress");
    const files = claimFiles(me._id, body.attachmentIds);
    if ((t.deliverables || []).length + files.length > MAX_FILES) fail(400, `Too many deliverables (max ${MAX_FILES})`);
    linkFiles(files, id, "deliverable");
    t.deliverables = [...(t.deliverables || []), ...files.map((f) => f._id)];
    t.submissionNote = trim(body.note);
    t.revisionNote = null;
    t.status = "submitted";
    t.submittedAt = nowIso();
    touch(t);
    notify(t.employer, "task_submitted", `${me.name} submitted work for "${t.title}"`, id);
    commit();
    return taskView(t);
  },

  async approve(id) {
    await delay();
    const me = current();
    const t = getTask(id);
    if (!isEmployer(me, t)) fail(403, "Only the employer who posted this task can do that");
    if (t.status !== "submitted") fail(400, "There is no submitted work to approve");
    t.status = "completed";
    t.completedAt = nowIso();
    touch(t);
    notify(t.freelancer, "task_completed", `"${t.title}" was approved. Nice work!`, id);
    audit(me._id, "task.approve", "task", id);
    commit();
    return taskView(t);
  },

  async revision(id, { note }) {
    await delay();
    const me = current();
    const t = getTask(id);
    if (!isEmployer(me, t)) fail(403, "Only the employer who posted this task can do that");
    if (t.status !== "submitted") fail(400, "There is no submitted work to review");
    if (!trim(note)) fail(400, "Please explain what needs to change");
    t.status = "assigned";
    t.revisionNote = note.trim();
    touch(t);
    notify(t.freelancer, "revision_requested", `Changes requested on "${t.title}"`, id);
    commit();
    return taskView(t);
  },

  async cancel(id, body = {}) {
    await delay();
    const me = current();
    const t = getTask(id);
    if (!isEmployer(me, t)) fail(403, "Only the employer who posted this task can do that");
    if (!["open", "assigned", "submitted"].includes(t.status)) fail(400, "This task can no longer be cancelled");
    t.status = "cancelled";
    t.cancelReason = trim(body.reason);
    touch(t);
    closePending(t, null, "task_cancelled", `The task "${t.title}" was cancelled`);
    notify(t.freelancer, "task_cancelled", `The task "${t.title}" was cancelled by the employer`, id);
    audit(me._id, "task.cancel", "task", id, t.cancelReason);
    commit();
    return taskView(t);
  },

  async complete(id) {
    await delay();
    const me = current();
    const t = getTask(id);
    if (t.status !== "assigned") fail(400, "Task is not assigned yet");
    if (!isAssignee(me, t)) fail(403, "Only assigned freelancer can mark this task complete");
    t.status = "completed";
    t.completedAt = nowIso();
    touch(t);
    notify(t.employer, "task_completed", `"${t.title}" was marked as completed`, id);
    commit();
    return { message: "Task marked as completed" };
  },

  async favorites({ page, size } = {}) {
    await delay();
    const me = current();
    const favs = sortNewest(D().favorites.filter((f) => f.user === me._id));
    const list = favs.map((f) => D().tasks.find((t) => t._id === f.task)).filter((t) => t && !t.hidden);
    const r = paged(list, { page, size });
    return { ...r, data: r.data.map(taskView) };
  },

  async addFavorite(id) {
    await delay(60);
    const me = current();
    const t = getTask(id);
    if (t.hidden) fail(404, "Task not found");
    if (!D().favorites.some((f) => f.user === me._id && f.task === id)) D().favorites.push({ user: me._id, task: id, createdAt: nowIso() });
    commit();
    return { message: "Task saved" };
  },

  async removeFavorite(id) {
    await delay(60);
    const me = current();
    D().favorites = D().favorites.filter((f) => !(f.user === me._id && f.task === id));
    commit();
    return { message: "Task removed from saved tasks" };
  },
};

// ------------------------------------------------------------------ saved searches

const savedSearches = {
  async list() {
    await delay();
    const me = current();
    return clone(sortNewest(D().savedSearches.filter((s) => s.user === me._id)).map((s) => ({ _id: s._id, name: s.name, filters: s.filters, createdAt: s.createdAt })));
  },

  async create({ name, ...filters }) {
    await delay();
    const me = current();
    if (!trim(name)) fail(400, "Name is required");
    if (D().savedSearches.filter((s) => s.user === me._id).length >= 20) fail(400, "You can save at most 20 searches");
    const s = {
      _id: newId("ss"),
      user: me._id,
      name: name.trim(),
      filters: {
        q: trim(filters.q) || "",
        location: trim(filters.location) || "",
        category: trim(filters.category) || "",
        skills: cleanList(filters.skills, 15, 40),
        minPrice: filters.minPrice === "" || filters.minPrice == null ? null : Number(filters.minPrice),
        maxPrice: filters.maxPrice === "" || filters.maxPrice == null ? null : Number(filters.maxPrice),
        latitude: filters.lat ?? null,
        longitude: filters.lng ?? null,
        radiusKm: filters.radiusKm ?? null,
      },
      createdAt: nowIso(),
    };
    D().savedSearches.push(s);
    commit();
    return clone({ _id: s._id, name: s.name, filters: s.filters, createdAt: s.createdAt });
  },

  async remove(id) {
    await delay(60);
    const me = current();
    D().savedSearches = D().savedSearches.filter((s) => !(s._id === id && s.user === me._id));
    commit();
    return { message: "Saved search deleted" };
  },
};

// ------------------------------------------------------------------ proposals

const proposals = {
  async submit(taskId, { price, message, etaDays }) {
    await delay();
    const me = current();
    requireRole(me, "freelancer", "Only freelancers can send proposals");
    const t = getTask(taskId);
    if (t.hidden) fail(404, "Task not found");
    if (t.status !== "open") fail(400, "This task is not accepting proposals");
    if (t.deadline && new Date(t.deadline).getTime() < Date.now()) fail(400, "Task has expired");
    if (isBlocked(me._id, t.employer)) fail(403, "You cannot send a proposal for this task");
    if (price == null || price === "" || Number(price) <= 0) fail(400, "Price must be positive");
    if (!trim(message)) fail(400, "A cover message is required");
    if (etaDays !== "" && etaDays != null && (Number(etaDays) < 1 || Number(etaDays) > 3650)) fail(400, "ETA must be at least 1 day");
    let p = D().proposals.find((x) => x.task === taskId && x.freelancer === me._id);
    if (p && p.status !== "withdrawn") fail(400, "You have already sent a proposal for this task");
    if (!p) {
      p = { _id: newId("p"), task: taskId, freelancer: me._id, createdAt: nowIso() };
      D().proposals.push(p);
    }
    p.price = Number(price);
    p.message = message.trim();
    p.etaDays = etaDays === "" || etaDays == null ? null : Number(etaDays);
    p.status = "pending";
    notify(t.employer, "proposal_received", `${me.name} sent a proposal for "${t.title}"`, taskId);
    commit();
    return proposalView(p);
  },

  async forTask(taskId) {
    await delay();
    const me = current();
    const t = getTask(taskId);
    if (!isEmployer(me, t) && me.role !== "admin") fail(403, "Only the employer who posted this task can see its proposals");
    return D().proposals.filter((p) => p.task === taskId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(proposalView);
  },

  async mine() {
    await delay();
    const me = current();
    requireRole(me, "freelancer", "Only freelancers have proposals");
    return sortNewest(D().proposals.filter((p) => p.freelancer === me._id)).map(proposalView);
  },

  async accept(id) {
    await delay();
    const me = current();
    const p = D().proposals.find((x) => x._id === id);
    if (!p) fail(404, "Proposal not found");
    const t = getTask(p.task);
    if (!isEmployer(me, t)) fail(403, "Only the employer who posted this task can do that");
    if (p.status !== "pending") fail(400, "This proposal is no longer pending");
    const assigned = assignTask(t._id, p.freelancer, p.price);
    if (!assigned) fail(400, "Task is no longer open");
    p.status = "accepted";
    closePending(assigned, p._id, "proposal_rejected", `Another proposal was chosen for "${assigned.title}"`);
    notify(p.freelancer, "proposal_accepted", `Your proposal for "${assigned.title}" was accepted`, assigned._id);
    commit();
    return taskView(assigned);
  },

  async reject(id) {
    await delay();
    const me = current();
    const p = D().proposals.find((x) => x._id === id);
    if (!p) fail(404, "Proposal not found");
    const t = getTask(p.task);
    if (!isEmployer(me, t)) fail(403, "Only the employer who posted this task can do that");
    if (p.status !== "pending") fail(400, "This proposal is no longer pending");
    p.status = "rejected";
    notify(p.freelancer, "proposal_rejected", `Your proposal for "${t.title}" was declined`, t._id);
    commit();
    return proposalView(p);
  },

  async withdraw(id) {
    await delay();
    const me = current();
    const p = D().proposals.find((x) => x._id === id);
    if (!p) fail(404, "Proposal not found");
    if (p.freelancer !== me._id) fail(403, "Access denied");
    if (p.status !== "pending") fail(400, "Only pending proposals can be withdrawn");
    p.status = "withdrawn";
    commit();
    return proposalView(p);
  },
};

// ------------------------------------------------------------------ messages

function conversationTask(me, taskId) {
  const t = getTask(taskId);
  if (!isParticipant(me, t)) fail(403, "Access denied");
  if (!t.freelancer) fail(400, "There is no conversation yet: no freelancer is assigned");
  return t;
}

const messageView = (m) => ({ _id: m._id, task: m.task, sender: m.sender, recipient: m.recipient, text: m.text, readAt: m.readAt, createdAt: m.createdAt });

const messages = {
  async send(taskId, text) {
    await delay(80);
    const me = current();
    const t = conversationTask(me, taskId);
    if (!["assigned", "submitted", "completed"].includes(t.status)) fail(400, "This conversation is closed");
    if (!trim(text)) fail(400, "Message cannot be empty");
    if (text.length > 2000) fail(400, "Message is too long");
    const other = isEmployer(me, t) ? t.freelancer : t.employer;
    if (isBlocked(me._id, other)) fail(403, "You cannot message this user");
    const m = { _id: newId("m"), seq: nextMessageSeq(), task: taskId, sender: me._id, recipient: other, text: text.trim(), readAt: null, createdAt: nowIso() };
    D().messages.push(m);
    commit();
    simulateReply(taskId, other, me._id);
    return messageView(m);
  },

  /** Oldest first. With `after` (a message id) only newer messages; otherwise the latest `limit`. */
  async list(taskId, { after, limit = 50 } = {}) {
    await delay(40);
    const me = current();
    conversationTask(me, taskId);
    const all = D().messages.filter((m) => m.task === taskId).sort((a, b) => a.seq - b.seq);
    if (after) {
      const anchor = all.find((m) => m._id === after);
      const seq = anchor ? anchor.seq : 0;
      return all.filter((m) => m.seq > seq).slice(0, Math.min(limit, 200)).map(messageView);
    }
    return all.slice(-Math.min(limit, 200)).map(messageView);
  },

  async markRead(taskId) {
    await delay(40);
    const me = current();
    conversationTask(me, taskId);
    let changed = false;
    D().messages.forEach((m) => {
      if (m.task === taskId && m.recipient === me._id && !m.readAt) {
        m.readAt = nowIso();
        changed = true;
      }
    });
    if (changed) commit();
    return { message: "Marked as read" };
  },

  async unreadCount() {
    await delay(30);
    const me = current();
    return { unread: D().messages.filter((m) => m.recipient === me._id && !m.readAt).length };
  },

  async conversations() {
    await delay();
    const me = current();
    const mine = D()
      .tasks.filter((t) => t.freelancer && (t.employer === me._id || t.freelancer === me._id))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return mine.map((t) => {
      const otherId = t.employer === me._id ? t.freelancer : t.employer;
      const thread = D().messages.filter((m) => m.task === t._id).sort((a, b) => a.seq - b.seq);
      return clone({
        taskId: t._id,
        taskTitle: t.title,
        taskStatus: t.status,
        otherUser: ref(otherId),
        lastMessage: thread.length ? messageView(thread[thread.length - 1]) : null,
        unread: thread.filter((m) => m.recipient === me._id && !m.readAt).length,
      });
    });
  },
};

// ------------------------------------------------------------------ notifications

const notifications = {
  async list({ unread = false, after, page, size } = {}) {
    await delay(60);
    const me = current();
    let list = sortNewest(D().notifications.filter((n) => n.user === me._id));
    if (unread) list = list.filter((n) => !n.read);
    if (after) {
      const anchor = D().notifications.find((n) => n._id === after);
      if (anchor) list = list.filter((n) => new Date(n.createdAt) > new Date(anchor.createdAt));
    }
    return paged(list, { page, size });
  },

  async unreadCount() {
    await delay(30);
    const me = current();
    return { unread: D().notifications.filter((n) => n.user === me._id && !n.read).length };
  },

  async markRead(id) {
    await delay(40);
    const me = current();
    const n = D().notifications.find((x) => x._id === id);
    if (!n) fail(404, "Notification not found");
    if (n.user !== me._id) fail(403, "Access denied");
    n.read = true;
    commit();
    return { message: "Marked as read" };
  },

  async markAllRead() {
    await delay(60);
    const me = current();
    D().notifications.filter((n) => n.user === me._id).forEach((n) => (n.read = true));
    commit();
    return { message: "All notifications marked as read" };
  },
};

// ------------------------------------------------------------------ ratings

const ratings = {
  async create({ to, task, score, comment }) {
    await delay();
    const me = current();
    const t = getTask(task);
    if (t.status !== "completed") fail(400, "Task is not completed yet");
    if (!isParticipant(me, t)) fail(403, "Not allowed to rate for this task");
    if (to === me._id || (to !== t.employer && to !== t.freelancer)) fail(400, "Invalid recipient");
    if (!(Number(score) >= 1 && Number(score) <= 5)) fail(400, "Score must be between 1 and 5");
    if (D().ratings.some((r) => r.from === me._id && r.to === to && r.task === task)) fail(400, "You have already rated this user for this task");
    const r = { _id: newId("r"), from: me._id, to, task, score: Number(score), comment: trim(comment), reply: null, repliedAt: null, createdAt: nowIso(), updatedAt: nowIso() };
    D().ratings.push(r);
    notify(to, "rating_received", `${me.name} rated you ${r.score}/5 for "${t.title}"`, task);
    commit();
    return ratingView(r);
  },

  async forUser(userId) {
    await delay();
    return sortNewest(D().ratings.filter((r) => r.to === userId)).map(ratingView);
  },

  async update(id, { score, comment }) {
    await delay();
    const me = current();
    const r = D().ratings.find((x) => x._id === id);
    if (!r) fail(404, "Rating not found");
    if (r.from !== me._id) fail(403, "You can only edit your own ratings");
    if (!(Number(score) >= 1 && Number(score) <= 5)) fail(400, "Score must be between 1 and 5");
    r.score = Number(score);
    r.comment = trim(comment);
    r.updatedAt = nowIso();
    commit();
    return ratingView(r);
  },

  async reply(id, { reply }) {
    await delay();
    const me = current();
    const r = D().ratings.find((x) => x._id === id);
    if (!r) fail(404, "Rating not found");
    if (r.to !== me._id) fail(403, "Only the rated user can reply");
    if (r.reply) fail(400, "You have already replied to this rating");
    if (!trim(reply)) fail(400, "Reply cannot be empty");
    r.reply = reply.trim();
    r.repliedAt = nowIso();
    notify(r.from, "rating_reply", `${me.name} replied to your rating`, r.task);
    commit();
    return ratingView(r);
  },
};

// ------------------------------------------------------------------ files

const files = {
  async upload(file) {
    await delay(260);
    const me = current();
    if (!file || !file.size) fail(400, "File is empty");
    if (file.size > MAX_FILE) fail(413, "File is too large (max 10 MB)");
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const type = (file.type || "").toLowerCase();
    if (!FILE_TYPES.includes(type) || !FILE_EXT.includes(ext)) fail(400, "Unsupported file type");
    const f = { _id: newId("f"), owner: me._id, task: null, kind: null, name: file.name, contentType: type, size: file.size, createdAt: nowIso() };
    D().files.push(f);
    blobs.set(f._id, file);
    commit();
    return fileView(f._id);
  },

  /** Opens/downloads a file after the same access check the backend performs. */
  async download(id) {
    await delay(80);
    const me = current();
    const f = D().files.find((x) => x._id === id);
    if (!f) fail(404, "File not found");
    const t = f.task ? D().tasks.find((x) => x._id === f.task) : null;
    const participant = t ? isParticipant(me, t) : false;
    const allowed = me.role === "admin" || f.owner === me._id || (t && (f.kind === "deliverable" ? participant : participant || !t.hidden));
    if (!allowed) fail(403, "Access denied");
    const blob = blobs.get(id) || new Blob([`${f.name}\n\nThis is a placeholder for the uploaded file.`], { type: f.contentType === "application/pdf" ? "text/plain" : f.contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { message: "Download started" };
  },

  async remove(id) {
    await delay(60);
    const me = current();
    const f = D().files.find((x) => x._id === id);
    if (f && f.owner === me._id && !f.task) {
      D().files = D().files.filter((x) => x._id !== id);
      blobs.delete(id);
      commit();
    }
    return { message: "File removed" };
  },
};

// ------------------------------------------------------------------ disputes & reports

const disputes = {
  async open(taskId, { reason }) {
    await delay();
    const me = current();
    const t = getTask(taskId);
    if (!isParticipant(me, t) || !t.freelancer) fail(403, "Only the employer or assigned freelancer can open a dispute");
    if (!["assigned", "submitted", "completed"].includes(t.status)) fail(400, "A dispute can only be opened on an active or completed task");
    if (D().disputes.some((d) => d.task === taskId && d.status === "open")) fail(400, "There is already an open dispute for this task");
    if (!trim(reason)) fail(400, "Please describe the problem");
    const against = isEmployer(me, t) ? t.freelancer : t.employer;
    const d = { _id: newId("d"), task: taskId, openedBy: me._id, against, reason: reason.trim(), status: "open", outcome: "none", resolutionNote: null, resolvedAt: null, createdAt: nowIso() };
    D().disputes.push(d);
    notify(against, "dispute_opened", `A dispute was opened on "${t.title}"`, taskId);
    notifyAdmins("dispute_opened", `New dispute on "${t.title}"`, taskId);
    audit(me._id, "dispute.open", "dispute", d._id, reason);
    commit();
    return disputeView(d);
  },

  async mine({ page, size } = {}) {
    await delay();
    const me = current();
    const list = sortNewest(D().disputes.filter((d) => d.openedBy === me._id || d.against === me._id));
    const r = paged(list, { page, size });
    return { ...r, data: r.data.map(disputeView) };
  },
};

const reports = {
  async create({ targetType, targetId, reason }) {
    await delay();
    const me = current();
    const exists = { user: D().users, task: D().tasks, rating: D().ratings }[targetType]?.some((x) => x._id === targetId);
    if (!exists) fail(404, "The reported item was not found");
    if (targetId === me._id) fail(400, "You cannot report yourself");
    if (!trim(reason)) fail(400, "Please give a reason");
    if (D().reports.some((r) => r.reporter === me._id && r.targetType === targetType && r.targetId === targetId && r.status === "open")) fail(400, "You have already reported this");
    const r = { _id: newId("rep"), reporter: me._id, targetType, targetId, reason: reason.trim(), status: "open", resolutionNote: null, resolvedAt: null, createdAt: nowIso() };
    D().reports.push(r);
    commit();
    return { _id: r._id, reporter: ref(me._id), targetType, targetId, reason: r.reason, status: r.status, createdAt: r.createdAt };
  },
};

// ------------------------------------------------------------------ admin

const admin = {
  async stats() {
    await delay();
    const me = current();
    requireRole(me, "admin", "Access denied");
    const usersByRole = { freelancer: 0, employer: 0, admin: 0 };
    D().users.forEach((u) => (usersByRole[u.role] += 1));
    const tasksByStatus = { open: 0, assigned: 0, submitted: 0, completed: 0, cancelled: 0, expired: 0 };
    D().tasks.forEach((t) => (tasksByStatus[t.status] += 1));
    return {
      usersByRole,
      tasksByStatus,
      totalRatings: D().ratings.length,
      openDisputes: D().disputes.filter((d) => d.status === "open").length,
      openReports: D().reports.filter((r) => r.status === "open").length,
    };
  },

  async users({ q, role, status, page, size } = {}) {
    await delay();
    requireRole(current(), "admin", "Access denied");
    let list = sortNewest(D().users);
    if (trim(q)) list = list.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase()));
    if (role) list = list.filter((u) => u.role === role);
    if (status) list = list.filter((u) => (status === "active" ? u.status !== "suspended" : u.status === status));
    const r = paged(list, { page, size });
    return { ...r, data: r.data.map(userView) };
  },

  async suspend(id, reason) {
    await delay();
    const me = current();
    requireRole(me, "admin", "Access denied");
    const u = D().users.find((x) => x._id === id);
    if (!u) fail(404, "User not found");
    if (u.role === "admin") fail(400, "Admins cannot be suspended");
    u.status = "suspended";
    audit(me._id, "user.suspend", "user", id, reason || null);
    commit();
    return userView(u);
  },

  async unsuspend(id) {
    await delay();
    const me = current();
    requireRole(me, "admin", "Access denied");
    const u = D().users.find((x) => x._id === id);
    if (!u) fail(404, "User not found");
    u.status = "active";
    audit(me._id, "user.unsuspend", "user", id);
    commit();
    return userView(u);
  },

  async tasks({ q, status, hidden, page, size } = {}) {
    await delay();
    requireRole(current(), "admin", "Access denied");
    let list = sortNewest(D().tasks);
    if (trim(q)) list = list.filter((t) => t.title.toLowerCase().includes(q.trim().toLowerCase()));
    if (status) list = list.filter((t) => t.status === status);
    if (hidden === true || hidden === "true") list = list.filter((t) => t.hidden);
    if (hidden === false || hidden === "false") list = list.filter((t) => !t.hidden);
    const r = paged(list, { page, size });
    return { ...r, data: r.data.map(taskView) };
  },

  async setHidden(id, hidden) {
    await delay();
    const me = current();
    requireRole(me, "admin", "Access denied");
    const t = getTask(id);
    t.hidden = hidden;
    audit(me._id, hidden ? "task.hide" : "task.unhide", "task", id, t.title);
    commit();
    return taskView(t);
  },

  async deleteRating(id) {
    await delay();
    const me = current();
    requireRole(me, "admin", "Access denied");
    const r = D().ratings.find((x) => x._id === id);
    if (!r) fail(404, "Rating not found");
    D().ratings = D().ratings.filter((x) => x._id !== id);
    audit(me._id, "rating.delete", "rating", id, `to=${r.to}`);
    commit();
    return { message: "Rating deleted" };
  },

  async disputes({ status, page, size } = {}) {
    await delay();
    requireRole(current(), "admin", "Access denied");
    const list = sortNewest(D().disputes.filter((d) => !status || d.status === status));
    const r = paged(list, { page, size });
    return { ...r, data: r.data.map(disputeView) };
  },

  async resolveDispute(id, { resolution, outcome = "none", note }) {
    await delay();
    const me = current();
    requireRole(me, "admin", "Access denied");
    const d = D().disputes.find((x) => x._id === id);
    if (!d) fail(404, "Dispute not found");
    if (d.status !== "open") fail(400, "This dispute is already closed");
    if (!["resolved", "dismissed"].includes(resolution)) fail(400, "Resolution must be resolved or dismissed");
    if (resolution === "dismissed" && outcome !== "none") fail(400, "A dismissed dispute cannot change the task");
    const t = D().tasks.find((x) => x._id === d.task);
    if (t && outcome === "complete_task" && t.status !== "completed") {
      t.status = "completed";
      t.completedAt = nowIso();
      touch(t);
    } else if (t && outcome === "cancel_task" && t.status !== "cancelled") {
      t.status = "cancelled";
      t.cancelReason = "Cancelled by moderator after dispute";
      touch(t);
    }
    d.status = resolution;
    d.outcome = outcome;
    d.resolutionNote = trim(note);
    d.resolvedAt = nowIso();
    const msg = `The dispute on ${t ? `"${t.title}"` : "a task"} was ${resolution}`;
    notify(d.openedBy, "dispute_resolved", msg, d.task);
    notify(d.against, "dispute_resolved", msg, d.task);
    audit(me._id, `dispute.${resolution}`, "dispute", id, outcome);
    commit();
    return disputeView(d);
  },

  async reports({ status, page, size } = {}) {
    await delay();
    requireRole(current(), "admin", "Access denied");
    const list = sortNewest(D().reports.filter((r) => !status || r.status === status));
    const r = paged(list, { page, size });
    return { ...r, data: r.data.map((x) => ({ ...x, reporter: ref(x.reporter) })) };
  },

  async resolveReport(id, { status, note }) {
    await delay();
    const me = current();
    requireRole(me, "admin", "Access denied");
    const r = D().reports.find((x) => x._id === id);
    if (!r) fail(404, "Report not found");
    if (r.status !== "open") fail(400, "This report is already closed");
    if (!["actioned", "dismissed"].includes(status)) fail(400, "Status must be actioned or dismissed");
    r.status = status;
    r.resolutionNote = trim(note);
    r.resolvedAt = nowIso();
    notify(r.reporter, "report_resolved", `Your report was reviewed (${status})`, null);
    audit(me._id, `report.${status}`, "report", id, `${r.targetType}:${r.targetId}`);
    commit();
    return { ...clone(r), reporter: ref(r.reporter) };
  },

  async audit({ page, size } = {}) {
    await delay();
    requireRole(current(), "admin", "Access denied");
    const r = paged(sortNewest(D().audit), { page, size });
    return { ...r, data: r.data.map((a) => ({ ...a, actor: ref(a.actor) })) };
  },
};

// ------------------------------------------------------------------ quick access (people and codes)

const dev = {
  /** Everyone in the sample data, with the password to sign in. */
  personas() {
    return D().users.map((u) => ({ _id: u._id, name: u.name, email: u.email, password: u.password, role: u.role, status: u.status }));
  },

  /** One-time codes that would normally arrive by email. */
  codes() {
    return D()
      .tokens.filter((t) => t.expiresAt > Date.now())
      .map((t) => ({ type: t.type, token: t.token, email: D().users.find((u) => u._id === t.user)?.email || "" }));
  },

  reset() {
    resetDb();
  },
};

export { ApiError };
export const api = { dev, auth, users, tasks, savedSearches, proposals, messages, notifications, ratings, files, disputes, reports, admin };
export default api;
