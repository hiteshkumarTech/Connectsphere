/** Normalizes ?page & ?limit query params into safe skip/limit values. */
function getPagination(req, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function meta(page, limit, total) {
  return { page, limit, total, pages: Math.ceil(total / limit), hasMore: page * limit < total };
}

module.exports = { getPagination, meta };
