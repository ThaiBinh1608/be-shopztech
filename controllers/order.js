const { response } = require("express");
const Order = require("../models/order");
const User = require("../models/user");
const Coupon = require("../models/coupon");
const asyncHandler = require("express-async-handler");

const createOrder = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { products, total, address, status, pay } = req.body;
  if (address) {
    await User.findByIdAndUpdate(_id, { address, cart: [] });
  }
  const data = {
    products,
    total,
    orderBy: _id,
    status,
    pay,
  };
  const rs = await Order.create(data);
  return res.json({
    success: rs ? true : false,
    rs: rs ? rs : "Cannot create order",
  });
});

const updateStatusOrder = asyncHandler(async (req, res) => {
  const { oid } = req.params;
  const { status } = req.body;
  if (!status) throw new Error("Missing status");
  const response = await Order.findByIdAndUpdate(
    oid,
    { status },
    { new: true }
  );

  return res.json({
    success: response ? true : false,
    mes: response ? "Updated" : "Cannot update status order",
  });
});

const getUserOrder = asyncHandler(async (req, res) => {
  const queries = { ...req.query };
  const { _id } = req.user;
  const excludeFields = ["limit", "sort", "page", "fields"];
  excludeFields.forEach((el) => delete queries[el]);
  let queryString = JSON.stringify(queries);
  queryString = queryString.replace(
    /\b(gte|gt|lte|lt)\b/g,
    (match) => `$${match}`
  );
  let formattedQueries = JSON.parse(queryString);
  const qr = { ...formattedQueries, orderBy: _id };
  let queryCommand = Order.find(qr);
  //sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    queryCommand = queryCommand.sort(sortBy);
  }
  //Fields limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    queryCommand = queryCommand.select(fields);
  }
  //Pagination
  const page = +req.query.page || 1;
  const limit = +req.query.limit || process.env.LIMIT_PRODUCTS;
  const skip = (page - 1) * limit;
  queryCommand.skip(skip).limit(limit);
  //Excute the query
  queryCommand.then(async (response) => {
    try {
      const counts = await Order.find(qr).countDocuments();
      return res.status(200).json({
        success: response ? true : false,
        counts,
        orders: response ? response : "Cannot get products",
      });
    } catch (err) {
      throw new Error(err.message);
    }
  });
});
const getOrder = asyncHandler(async (req, res) => {
  const queries = { ...req.query };
  const excludeFields = ["limit", "sort", "page", "fields"];
  excludeFields.forEach((el) => delete queries[el]);
  let queryString = JSON.stringify(queries);
  queryString = queryString.replace(
    /\b(gte|gt|lte|lt)\b/g,
    (match) => `$${match}`
  );
  let formattedQueries = JSON.parse(queryString);
  const qr = { ...formattedQueries };
  let queryCommand = Order.find(qr);
  //sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    queryCommand = queryCommand.sort(sortBy);
  }
  //Fields limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    queryCommand = queryCommand.select(fields);
  }
  //Pagination
  const page = +req.query.page || 1;
  const limit = +req.query.limit || process.env.LIMIT_PRODUCTS;
  const skip = (page - 1) * limit;
  queryCommand.skip(skip).limit(limit);
  //Excute the query
  queryCommand.then(async (response) => {
    try {
      const counts = await Order.find(qr).countDocuments();
      return res.status(200).json({
        success: response ? true : false,
        counts,
        orders: response ? response : "Cannot get products",
      });
    } catch (err) {
      throw new Error(err.message);
    }
  });
});

const deleteOrder = asyncHandler(async (req, res) => {
  const { oid } = req.params;
  const deletedProduct = await Order.findByIdAndDelete(oid);
  return res.status(200).json({
    success: deletedProduct ? true : false,
    mes: deletedProduct ? "Deleted" : "Cannot delete order",
  });
});

module.exports = {
  createOrder,
  updateStatusOrder,
  getUserOrder,
  getOrder,
  deleteOrder,
};
