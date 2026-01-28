// src/utils/validation.js
function validateInput(input) {
  if (!input || input.trim() === "") {
    return false;
  }

  const number = parseInt(input);
  if (isNaN(number)) {
    return false;
  }

  return true;
}

function validatePayment(data) {
  const { amount, email } = data;

  if (!amount || amount <= 0) {
    return false;
  }

  if (!email || !isValidEmail(email)) {
    return false;
  }

  return true;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  validateInput,
  validatePayment,
};
