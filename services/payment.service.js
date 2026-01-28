const axios = require("axios");

class PaymentService {
  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseURL = "https://api.paystack.co";

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async initializePayment(data) {
    try {
      const response = await this.axiosInstance.post(
        "/transaction/initialize",
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }

  async verifyPayment(reference) {
    try {
      const response = await this.axiosInstance.get(
        `/transaction/verify/${reference}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }
}

module.exports = new PaymentService();
