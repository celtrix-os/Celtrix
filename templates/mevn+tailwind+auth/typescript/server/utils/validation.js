const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const normalizeEmail = (email) => email.trim().toLowerCase();

module.exports = { isNonEmptyString, normalizeEmail };
