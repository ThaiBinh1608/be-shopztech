const { response } = require("express");
const Product = require("../models/product");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const data = require("../data/ecommerce.json");
const categorydata = require("../data/cateBrand");
const ProductCategory = require("../models/productCategory");

const fn = async (product) => {
  await Product.create({
    title: product?.name,
    slug: slugify(product?.name) + Math.round(Math.random() * 100) + " ",
    description: product?.description,
    brand: product?.brand,
    price: Math.round(Number(product?.price?.match(/\d/g).join("")) / 100),
    category: product?.category[1],
    quantity: Math.round(Math.random() * 300),
    sold: Math.round(Math.random() * 100),
    images: product?.images,
    color:
      product?.variants?.find((el) => el.label === "Color")?.variants[0] ||
      "BLACK",
    thumb: product?.thumb,
    totalRatings: 0,
  });
};
const insertDataProduct = asyncHandler(async (req, res) => {
  const promises = [];
  for (let product of data) promises.push(fn(product));
  await Promise.all(promises);
  return res.json("Completed");
});

const fn2 = async (cate) => {
  await ProductCategory.create({
    title: cate?.cate,
    brand: cate?.brand,
    image: cate?.image,
  });
};
const insertDataCategory = asyncHandler(async (req, res) => {
  const promises = [];
  console.log(categorydata);
  for (let cate of categorydata) promises.push(fn2(cate));
  await Promise.all(promises);
  return res.json("Completed");
});
module.exports = {
  insertDataProduct,
  insertDataCategory,
};
