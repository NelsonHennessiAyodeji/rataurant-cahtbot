const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

class ChatController {
  constructor() {
    this.menu = [
      { id: 1, name: "Jollof Rice with Chicken", price: 2500 },
      { id: 2, name: "Fried Rice with Beef", price: 2800 },
      { id: 3, name: "Pounded Yam with Egusi Soup", price: 3200 },
      { id: 4, name: "Spaghetti Bolognese", price: 2000 },
      { id: 5, name: "Chicken Shawarma", price: 1800 },
      { id: 6, name: "Beef Burger", price: 2200 },
      { id: 7, name: "Caesar Salad", price: 1500 },
      { id: 8, name: "Chapman Drink", price: 800 },
      { id: 9, name: "Coca Cola", price: 500 },
      { id: 10, name: "Water", price: 300 },
    ];
  }

  // Use arrow functions to bind 'this'
  handleMessage = async (req, res) => {
    try {
      console.log("Received message:", req.body);

      const { message } = req.body;

      // Initialize session if not exists
      if (!req.session.initialized) {
        req.session.initialized = true;
        req.session.orders = [];
        req.session.currentOrder = {
          id: uuidv4(),
          items: [],
          total: 0,
          status: "pending",
        };
      }

      // Parse input
      const input = parseInt(message);

      if (isNaN(input)) {
        return res.json({
          response: "Please enter a valid number",
          options: this.getMainOptions(),
        });
      }

      let response = "";
      let options = "";

      // Handle different inputs
      switch (input) {
        case 1:
          response = this.getMenu();
          options =
            "Enter item number (1-10) to add to order, 99 to checkout, or 0 to cancel";
          break;

        case 99:
          if (req.session.currentOrder.items.length === 0) {
            response = "No order to place. Your cart is empty.";
            options = this.getMainOptions();
          } else {
            // Save current order to history
            req.session.orders.push({
              ...req.session.currentOrder,
              createdAt: new Date(),
            });

            // Reset current order
            req.session.currentOrder = {
              id: uuidv4(),
              items: [],
              total: 0,
              status: "pending",
            };

            response =
              "Order placed successfully! Your order ID is: " +
              req.session.orders[req.session.orders.length - 1].id;
            options = "Enter 1 to start new order or 98 to view order history";
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
            };
            response = "Order cancelled successfully.";
          } else {
            response = "No order to cancel.";
          }
          options = this.getMainOptions();
          break;

        default:
          // Check if it's a menu item (1-10)
          if (input >= 1 && input <= this.menu.length) {
            const item = this.menu[input - 1];
            req.session.currentOrder.items.push(item);
            req.session.currentOrder.total += item.price;
            response = `Added ${item.name} (₦${item.price}) to your order.`;
            response += `\nCurrent total: ₦${req.session.currentOrder.total}`;
            options =
              "Enter another item number (1-10), 99 to checkout, or 0 to cancel";
          } else {
            response = "Invalid option.";
            options = this.getMainOptions();
          }
      }

      res.json({
        response,
        options,
        currentOrder: req.session.currentOrder,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(500).json({
        response: "An error occurred. Please try again.",
        options:
          "Select 1 to Place an order\nSelect 99 to checkout order\nSelect 98 to see order history\nSelect 97 to see current order\nSelect 0 to cancel order",
      });
    }
  };

  getMenu = () => {
    return this.menu
      .map((item) => `${item.id}. ${item.name} - ₦${item.price}`)
      .join("\n");
  };

  getMainOptions = () => {
    return "Select 1 to Place an order\nSelect 99 to checkout order\nSelect 98 to see order history\nSelect 97 to see current order\nSelect 0 to cancel order";
  };

  getCurrentOrder = (order) => {
    if (!order || order.items.length === 0) {
      return "Your cart is empty.";
    }

    const items = order.items
      .map((item) => `- ${item.name}: ₦${item.price}`)
      .join("\n");

    return `Current Order:\n${items}\n\nTotal: ₦${order.total}`;
  };

  getOrderHistory = (orders) => {
    if (!orders || orders.length === 0) {
      return "No order history.";
    }

    return orders
      .map((order, index) => {
        const items = order.items
          .map((item) => `  ${item.name}: ₦${item.price}`)
          .join("\n");

        return `Order ${index + 1} (${order.id}):\n${items}\nTotal: ₦${
          order.total
        }\n`;
      })
      .join("\n");
  };

  // Payment methods
  initializePayment = async (req, res) => {
    try {
      const { email, amount } = req.body;

      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email,
          amount: amount * 100, // Convert to kobo
          callback_url: `${req.protocol}://${req.get(
            "host"
          )}/api/payment/verify`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      res.json(response.data);
    } catch (error) {
      console.error("Payment error:", error.response?.data || error.message);
      res.status(500).json({ error: "Payment initialization failed" });
    }
  };

  verifyPayment = async (req, res) => {
    try {
      const { reference } = req.query;

      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (response.data.data.status === "success") {
        res.redirect("/?payment=success");
      } else {
        res.redirect("/?payment=failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      res.redirect("/?payment=error");
    }
  };
}

module.exports = new ChatController();
