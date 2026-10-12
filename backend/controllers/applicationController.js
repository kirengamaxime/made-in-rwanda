const { query, tx } = require('../config/db');
const users = require('../models/users');
const { applicationJson, sellerJson } = require('../models/mappers');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const generatePassword = require('../utils/generatePassword');
const v = require('../utils/validators');
const { saveImages, deleteImages } = require('../services/storageService');

exports.submit = asyncHandler(async (req, res) => {
  const b = req.body;
  const files = req.files || {};
  const errors = {};
  if (!v.isNonEmpty(b.fullName, 2, 100)) errors.fullName = 'Enter your full name.';
  if (!v.isEmail(b.email)) errors.email = 'Enter a valid email address.';
  const phone = v.normalizePhone(b.phone);
  if (!phone) errors.phone = 'Invalid phone number. Use a Rwanda number such as 0781234567.';
  if (b.nationalId && !/^\d{16}$/.test(String(b.nationalId).replace(/\s/g, ''))) errors.nationalId = 'A Rwandan National ID has 16 digits.';
  if (!v.isNonEmpty(b.address, 3, 250)) errors.address = 'Enter your address.';
  if (!v.isNonEmpty(b.district, 2, 60)) errors.district = 'Select your district.';
  if (!v.isNonEmpty(b.sector, 2, 60)) errors.sector = 'Enter your sector.';
  if (!v.isNonEmpty(b.businessName, 2, 120)) errors.businessName = 'Enter your business name.';
  if (!v.isNonEmpty(b.businessDescription, 20, 2000)) errors.businessDescription = 'Describe your business in at least 20 characters.';
  if (!v.isNonEmpty(b.businessCategory, 2, 60)) errors.businessCategory = 'Select a business category.';
  if (!v.isNonEmpty(b.businessLocation, 3, 250)) errors.businessLocation = 'Enter your business location.';
  const businessPhone = v.normalizePhone(b.businessPhone);
  if (!businessPhone) errors.businessPhone = 'Invalid business phone number.';
  if (!v.isEmail(b.businessEmail)) errors.businessEmail = 'Enter a valid business email.';
  if (b.registrationNumber && !v.isNonEmpty(b.registrationNumber, 1, 60)) errors.registrationNumber = 'Registration number is too long.';
  if (!files.logo?.[0]) errors.logo = 'Upload your business logo.';
  if (!files.storePhoto?.[0]) errors.storePhoto = 'Upload a photo of your business or store.';
  v.throwIfErrors(errors);

  const email = b.email.trim().toLowerCase();
  const dup = await query("select 1 from seller_applications where email = $1 and status in ('pending','approved')", [email]);
  if (dup.rowCount) throw new AppError('Seller application already submitted', 409, { email: 'An application with this email already exists.' });

  const uploaded = [];
  try {
    const [logo] = await saveImages(files.logo, 'applications'); uploaded.push(logo);
    const [storePhoto] = await saveImages(files.storePhoto, 'applications'); uploaded.push(storePhoto);
    const businessImages = await saveImages(files.images || [], 'applications'); uploaded.push(...businessImages);

    const { rows } = await query(
      `insert into seller_applications
        (applicant_id, full_name, email, phone, national_id, address, district, sector, business_name, business_description,
         business_category, business_location, business_phone, business_email, registration_number, logo, store_photo, business_images, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'pending') returning id, status, business_name`,
      [req.user ? req.user._id : null, b.fullName.trim(), email, phone, b.nationalId ? String(b.nationalId).replace(/\s/g, '') : null,
        b.address.trim(), b.district.trim(), b.sector.trim(), b.businessName.trim(), b.businessDescription.trim(),
        b.businessCategory.trim(), b.businessLocation.trim(), businessPhone, b.businessEmail.trim().toLowerCase(),
        b.registrationNumber ? b.registrationNumber.trim() : null, logo, storePhoto, businessImages]
    );
    res.status(201).json({
      success: true,
      message: 'Your seller application has been submitted successfully. Our team will review your application.',
      application: { _id: rows[0].id, status: rows[0].status, businessName: rows[0].business_name },
    });
  } catch (err) {
    await deleteImages(uploaded);
    throw err;
  }
});

// Public: lets an applicant check where their application stands (status only, no personal data).
exports.checkStatus = asyncHandler(async (req, res) => {
  if (!v.isEmail(req.query.email)) throw new AppError('Enter a valid email address.', 400);
  const { rows } = await query(
    'select status, rejection_reason, created_at, business_name from seller_applications where email = $1 order by created_at desc limit 1',
    [req.query.email.trim().toLowerCase()]
  );
  if (!rows[0]) throw new AppError('Seller application not found', 404);
  const a = rows[0];
  res.json({ success: true, application: { status: a.status, businessName: a.business_name, submittedAt: a.created_at, rejectionReason: a.status === 'rejected' ? a.rejection_reason : undefined } });
});

exports.list = asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  if (['pending', 'approved', 'rejected'].includes(req.query.status)) { params.push(req.query.status); where.push(`status = $${params.length}`); }
  if (v.isString(req.query.q) && req.query.q.trim()) {
    params.push(`%${v.escapeLike(req.query.q.trim().slice(0, 80))}%`);
    where.push(`(full_name ilike $${params.length} or business_name ilike $${params.length} or email ilike $${params.length})`);
  }
  const { rows } = await query(`select * from seller_applications ${where.length ? `where ${where.join(' and ')}` : ''} order by created_at desc`, params);
  res.json({ success: true, applications: rows.map((r) => applicationJson(r)) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `select a.*, case when r.id is null then null else json_build_object('_id', r.id, 'name', r.name, 'email', r.email) end as reviewed_by_user
     from seller_applications a left join users r on r.id = a.reviewed_by where a.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) throw new AppError('Seller application not found', 404);
  const { reviewed_by_user: reviewer, ...row } = rows[0];
  res.json({ success: true, application: { ...applicationJson(row, { withNationalId: true }), reviewedBy: reviewer } });
});

exports.approve = asyncHandler(async (req, res) => {
  const result = await tx(async (c) => {
    // lock the row so two admins cannot approve the same application at once
    const a = (await c.query('select * from seller_applications where id = $1 for update', [req.params.id])).rows[0];
    if (!a) throw new AppError('Seller application not found', 404);
    if (a.status === 'approved') throw new AppError('Application already approved', 400);
    if (a.status === 'rejected') throw new AppError('This application was rejected. The applicant must submit a new application.', 400);

    const loginEmail = String(req.body.loginEmail || a.email).trim().toLowerCase();
    if (!v.isEmail(loginEmail)) throw new AppError('Enter a valid seller login email.', 400, { loginEmail: 'Enter a valid email.' });
    let password = req.body.password;
    if (password) {
      if (!v.isStrongPassword(password)) throw new AppError('Password must be at least 8 characters with uppercase, lowercase and a number.', 400, { password: 'Password is too weak.' });
    } else {
      password = generatePassword();
    }
    if ((await c.query('select 1 from users where email = $1', [loginEmail])).rowCount) {
      throw new AppError('An account with this email already exists. Provide a different seller login email.', 409, { loginEmail: 'Email already in use.' });
    }

    const user = await users.createUser({ name: a.full_name, email: loginEmail, phone: a.phone, password, role: 'seller', mustChangePassword: true }, c);
    const seller = (await c.query(
      `insert into sellers (user_id, application_id, business_name, business_description, business_category, business_location, district, sector,
                            business_phone, business_email, registration_number, logo, store_photo, business_images, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'approved') returning *`,
      [user.id, a.id, a.business_name, a.business_description, a.business_category, a.business_location, a.district, a.sector,
        a.business_phone, a.business_email, a.registration_number, a.logo, a.store_photo, a.business_images]
    )).rows[0];
    const updated = (await c.query(
      `update seller_applications set status = 'approved', reviewed_by = $1, reviewed_at = now(), seller_id = $2, rejection_reason = null
       where id = $3 returning *`,
      [req.user._id, seller.id, a.id]
    )).rows[0];
    return { application: updated, seller, credentials: { email: loginEmail, password, loginUrl: '/seller/login' } };
  });
  res.json({
    success: true,
    message: 'Application approved. Share these credentials with the seller securely - the password is shown only once.',
    application: applicationJson(result.application), seller: sellerJson(result.seller), credentials: result.credentials,
  });
});

exports.reject = asyncHandler(async (req, res) => {
  const reason = req.body.reason;
  if (!v.isNonEmpty(reason, 5, 1000)) throw new AppError('Please provide a rejection reason (at least 5 characters).', 400, { reason: 'A reason is required.' });
  const updated = await tx(async (c) => {
    const a = (await c.query('select * from seller_applications where id = $1 for update', [req.params.id])).rows[0];
    if (!a) throw new AppError('Seller application not found', 404);
    if (a.status === 'approved') throw new AppError('Application already approved', 400);
    if (a.status === 'rejected') throw new AppError('Application already rejected', 400);
    return (await c.query(
      "update seller_applications set status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = now() where id = $3 returning *",
      [reason.trim(), req.user._id, a.id]
    )).rows[0];
  });
  res.json({ success: true, message: 'Application rejected.', application: applicationJson(updated) });
});
