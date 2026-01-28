// src/controllers/chatController.js
const { v4: uuidv4 } = require("uuid");
const paymentService = require("../services/paymentService");
const { validateInput, validatePayment } = require("../utils/validation");

class ChatController {
  constructor() {
    this.menu = [
      {
        id: 1,
        name: "Jollof Rice with Chicken",
        price: 2500,
        category: "main",
      },
      { id: 2, name: "Fried Rice with Beef", price: 2800, category: "main" },
      {
        id: 3,
        name: "Pounded Yam with Egusi Soup",
        price: 3200,
        category: "main",
      },
      { id: 4, name: "Spaghetti Bolognese", price: 2000, category: "main" },
      { id: 5, name: "Chicken Shawarma", price: 1800, category: "fast-food" },
      { id: 6, name: "Beef Burger", price: 2200, category: "fast-food" },
      { id: 7, name: "Caesar Salad", price: 1500, category: "salad" },
      { id: 8, name: "Chapman Drink", price: 800, category: "drinks" },
      { id: 9, name: "Coca Cola", price: 500, category: "drinks" },
      { id: 10, name: "Water", price: 300, category: "drinks" },
    ];
  }

  handleMessage(req, res) {
    try {
      const { message } = req.body;
      const sessionId = req.session.id;

      if (!validateInput(message)) {
        return res.json({
          response: "Invalid input. Please enter a valid number.",
          options: this.getMainOptions(),
        });
      }

      const input = parseInt(message);

      if (!req.session.orders) {
        req.session.orders = [];
      }

      if (!req.session.currentOrder) {
        req.session.currentOrder = {
          id: uuidv4(),
          items: [],
          total: 0,
          status: "pending",
          createdAt: new Date(),
        };
      }

      let response = "";
      let options = "";

      switch (input) {
        case 1:
          response = this.getMenu();
          options =
            "Enter item number to add to order, or 99 to checkout, 0 to cancel";
          break;

        case 99:
          if (req.session.currentOrder.items.length === 0) {
            response = "No order to place. Your cart is empty.";
            options = this.getMainOptions();
          } else {
            req.session.orders.push({ ...req.session.currentOrder });
            req.session.currentOrder = {
              id: uuidv4(),
              items: [],
              total: 0,
              status: "pending",
              createdAt: new Date(),
            };
            response = "Order placed successfully! Proceed to payment.";
            options = "Enter 1 to start new order or 2 to pay now";
          }
          break;

        case 98:
          response = this.getOrderHistory(req.session.orders);
          options = this.getMainOptions();
          break;

        case 97:
          response = this.getCurrentOrder(req.session.currentOrder);
          options = this.getMainOptions();
          break;

        case 0:
          if (req.session.currentOrder.items.length > 0) {
            req.session.currentOrder = {
              id: uuidv4(),
              items: [],
              total: 0,
              status: "pending",
              createdAt: new Date(),
            };
            response = "Order cancelled successfully.";
          } else {
            response = "No order to cancel.";
          }
          options = this.getMainOptions();
          break;

        case 2:
          if (
            req.session.orders.length > 0 &&
            req.session.orders[req.session.orders.length - 1].status ===
              "pending"
          ) {
            response = "Proceeding to payment...";
            options = "Please wait while we redirect you to payment.";
          } else {
            response = "No pending order to pay for.";
            options = this.getMainOptions();
          }
          break;

        default:
          if (input >= 1 && input <= this.menu.length) {
            const selectedItem = this.menu.find((item) => item.id === input);
            if (selectedItem) {
              req.session.currentOrder.items.push(selectedItem);
              req.session.currentOrder.total += selectedItem.price;
              response = `Added ${selectedItem.name} to your order. Current total: ₦${req.session.currentOrder.total}`;
              options =
                "Enter another item number, 99 to checkout, or 0 to cancel";
            }
          } else {
            response = "Invalid selection.";
            options = this.getMainOptions();
          }
      }

      res.json({
        sessionId,
        response,
        options,
        currentOrder: req.session.currentOrder,
      });
    } catch (error) {
      console.error("Error handling message:", error);
      res.status(500).json({
        response: "An error occurred. Please try again.",
        options: this.getMainOptions(),
      });
    }
  }

  getMenu() {
    let menuText = "Our Menu:\n";
    this.menu.forEach((item) => {
      menuText += `${item.id}. ${item.name} - ₦${item.price}\n`;
    });
    return menuText;
  }

  getMainOptions() {
    return "Select 1 to Place an order\nSelect 99 to checkout order\nSelect 98 to see order history\nSelect 97 to see current order\nSelect 0 to cancel order";
  }

  getCurrentOrder(currentOrder) {
    if (!currentOrder || currentOrder.items.length === 0) {
      return "Your current order is empty.";
    }

    let orderText = "Current Order:\n";
    currentOrder.items.forEach((item, index) => {
      orderText += `${index + 1}. ${item.name} - ₦${item.price}\n`;
    });
    orderText += `\nTotal: ₦${currentOrder.total}`;
    return orderText;
  }

  getOrderHistory(orders) {
    if (!orders || orders.length === 0) {
      return "No order history available.";
    }

    let historyText = "Order History:\n";
    orders.forEach((order, index) => {
      historyText += `\nOrder ${index + 1} (${order.status}):\n`;
      order.items.forEach((item) => {
        historyText += `  - ${item.name} - ₦${item.price}\n`;
      });
      historyText += `  Total: ₦${order.total}\n`;
      historyText += `  Date: ${order.createdAt.toLocaleString()}\n`;
    });
    return historyText;
  }

  async initializePayment(req, res) {
    try {
      const { amount, email, orderId } = req.body;

      if (!validatePayment({ amount, email })) {
        return res.status(400).json({ error: "Invalid payment details" });
      }

      const paymentData = {
        amount: amount * 100,
        email,
        reference: `order_${orderId}_${Date.now()}`,
        callback_url: `${req.protocol}://${req.get("host")}/api/payment/verify`,
        metadata: {
          orderId,
          sessionId: req.session.id,
        },
      };

      const paymentResponse = await paymentService.initializePayment(
        paymentData
      );

      res.json({
        authorization_url: paymentResponse.data.authorization_url,
        access_code: paymentResponse.data.access_code,
        reference: paymentResponse.data.reference,
      });
    } catch (error) {
      console.error("Payment initialization error:", error);
      res.status(500).json({ error: "Payment initialization failed" });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { reference } = req.query;
      const verification = await paymentService.verifyPayment(reference);

      if (verification.data.status === "success") {
        const orderId = verification.data.metadata.orderId;

        req.session.orders = req.session.orders.map((order) => {
          if (order.id === orderId) {
            return { ...order, status: "paid", paidAt: new Date() };
          }
          return order;
        });

        res.redirect(`/?payment=success&reference=${reference}`);
      } else {
        res.redirect(`/?payment=failed`);
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.redirect(`/?payment=error`);
    }
  }

  scheduleOrder(req, res) {
    try {
      const { orderId, scheduleTime } = req.body;

      if (!scheduleTime || new Date(scheduleTime) <= new Date()) {
        return res.status(400).json({ error: "Invalid schedule time" });
      }

      const order = req.session.orders.find((o) => o.id === orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      order.scheduledFor = new Date(scheduleTime);
      order.status = "scheduled";

      res.json({
        success: true,
        message: `Order scheduled for ${new Date(
          scheduleTime
        ).toLocaleString()}`,
        order,
      });
    } catch (error) {
      console.error("Schedule error:", error);
      res.status(500).json({ error: "Failed to schedule order" });
    }
  }
}

module.exports = new ChatController();
