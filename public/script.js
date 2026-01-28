class ChatBot {
  constructor() {
    this.sessionId = null;
    this.currentOrder = null;
    this.messageInput = document.getElementById("messageInput");
    this.sendButton = document.getElementById("sendButton");
    this.chatMessages = document.getElementById("chatMessages");
    this.orderSummary = document.getElementById("summaryContent");
    this.totalAmount = document.getElementById("totalAmount");
    this.paymentModal = document.getElementById("paymentModal");
    this.scheduleModal = document.getElementById("scheduleModal");

    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.checkPaymentStatus();
    this.messageInput.focus();
  }

  setupEventListeners() {
    this.sendButton.addEventListener("click", () => this.sendMessage());
    this.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.sendMessage();
    });

    document.getElementById("paymentForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.processPayment();
    });

    document.getElementById("cancelPayment").addEventListener("click", () => {
      this.paymentModal.style.display = "none";
    });

    document.getElementById("scheduleForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.scheduleOrder();
    });

    document.getElementById("cancelSchedule").addEventListener("click", () => {
      this.scheduleModal.style.display = "none";
    });
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;

    this.addMessage(message, "user");
    this.messageInput.value = "";

    try {
      const response = await fetch("/api/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (data.sessionId) {
        this.sessionId = data.sessionId;
        document.getElementById("sessionId").textContent =
          this.sessionId.substring(0, 8) + "...";
      }

      this.addMessage(data.response, "bot", data.options);

      if (data.currentOrder) {
        this.updateOrderSummary(data.currentOrder);
        this.currentOrder = data.currentOrder;
      }

      if (data.response.includes("Proceed to payment")) {
        this.showPaymentModal();
      }
    } catch (error) {
      console.error("Error:", error);
      this.addMessage("Sorry, an error occurred. Please try again.", "bot");
    }
  }

  addMessage(content, sender, options = null) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.textContent = content;
    messageDiv.appendChild(contentDiv);

    if (options) {
      const optionsDiv = document.createElement("div");
      optionsDiv.className = "message-options";
      optionsDiv.innerHTML = options.replace(/\n/g, "<br>");
      messageDiv.appendChild(optionsDiv);
    }

    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  updateOrderSummary(order) {
    if (!order || order.items.length === 0) {
      this.orderSummary.textContent = "No items in order";
      this.totalAmount.textContent = "Total: ₦0";
      return;
    }

    let summary = "";
    order.items.forEach((item, index) => {
      summary += `${index + 1}. ${item.name} - ₦${item.price}<br>`;
    });

    this.orderSummary.innerHTML = summary;
    this.totalAmount.textContent = `Total: ₦${order.total}`;
  }

  showPaymentModal() {
    if (!this.currentOrder) return;

    document.getElementById("orderAmount").value = this.currentOrder.total;
    document.getElementById("orderId").value = this.currentOrder.id;
    this.paymentModal.style.display = "flex";
    document.getElementById("emailInput").focus();
  }

  async processPayment() {
    const email = document.getElementById("emailInput").value;
    const amount = document.getElementById("orderAmount").value;
    const orderId = document.getElementById("orderId").value;

    if (!email || !amount) {
      alert("Please enter your email");
      return;
    }

    try {
      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          email,
          orderId,
        }),
      });

      const data = await response.json();

      if (data.authorization_url) {
        window.open(data.authorization_url, "_blank");
        this.paymentModal.style.display = "none";
        this.addMessage(
          "Payment link opened. Please complete the payment in the new window.",
          "bot"
        );
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment initialization failed. Please try again.");
    }
  }

  checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const reference = urlParams.get("reference");

    if (paymentStatus === "success") {
      this.addMessage(`Payment successful! Reference: ${reference}`, "bot");
      this.addMessage(
        "Thank you for your order! It will be prepared shortly.",
        "bot"
      );
      window.history.replaceState({}, document.title, "/");
    } else if (paymentStatus === "failed") {
      this.addMessage("Payment failed. Please try again.", "bot");
      window.history.replaceState({}, document.title, "/");
    }
  }

  scheduleOrder() {
    const scheduleTime = document.getElementById("scheduleTime").value;
    const orderId = document.getElementById("scheduleOrderId").value;

    if (!scheduleTime) {
      alert("Please select a schedule time");
      return;
    }

    fetch("/api/schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        scheduleTime,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          this.addMessage(data.message, "bot");
          this.scheduleModal.style.display = "none";
        } else {
          alert(data.error);
        }
      })
      .catch((error) => {
        console.error("Schedule error:", error);
        alert("Failed to schedule order");
      });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ChatBot();
});
