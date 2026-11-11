// MailerSend rejects with the HTTP response (statusCode + body), not an Error. Turn it into
// something the logger shows, e.g. { status: 422, message: 'The from.email domain must be verified...' }.
// Contains no API key or other secret.
function describeMailError(error) {
  if (!error) return { message: 'unknown error' };
  const body = error.body || error.response?.body;
  return {
    status: error.statusCode || error.status || error.response?.status,
    message: body?.message || error.message || String(error),
    ...(body?.errors ? { errors: body.errors } : {}),
  };
}

module.exports = { describeMailError };
