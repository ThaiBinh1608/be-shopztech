const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var orderSchema = new mongoose.Schema(
  {
    products: [
      {
        product: { type: mongoose.Types.ObjectId, ref: "Product" },
        quantity: Number,
        color: String,
        price: Number,
        thumbnail: String,
        title: String,
      },
    ],
    status: {
      type: String,
      default: "Đang xác nhận",
      enum: ["Đã hủy", "Đã giao", "Đang xác nhận"],
    },
    pay: {
      type: String,
      default: "Tiền mặt",
      enum: ["Tiền mặt", "Chuyển khoản"],
    },
    total: Number,

    orderBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("Order", orderSchema);
