const User = require("../models/user");
const asyncHandler = require("express-async-handler");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/jwt");
const jwt = require("jsonwebtoken");
const sendMail = require("../ultils/sendMail");
const crypto = require("crypto");
const makeToken = require("uniqid");
// const register = asyncHandler(async (req, res) => {
//   const { email, password, firstName, lastName } = req.body;
//   if (!email || !password || !lastName || !firstName)
//     return res.status(400).json({
//       success: false,
//       mes: "Missing inputs",
//     });

//   const user = await User.findOne({ email });
//   if (user) throw new Error("User has existed");
//   else {
//     const newUser = await User.create(req.body);
//     return res.status(200).json({
//       success: newUser ? true : false,
//       mes: newUser
//         ? "Register is successfully. Please go login~"
//         : "Something went wrong",
//     });
//   }
// });
const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, mobile } = req.body;
  if (!email || !password || !lastName || !firstName || !mobile)
    return res.status(400).json({
      success: false,
      mes: "Missing inputs",
    });
  const user = await User.findOne({ email });
  if (user) throw new Error("User has existed");
  else {
    const token = makeToken();
    const emailedited = btoa(email) + "@" + token;
    const newUser = await User.create({
      email: emailedited,
      password,
      firstName,
      lastName,
      mobile,
    });
    if (newUser) {
      const html = `<h2>Mã Code đăng ký tài khoản</h2> <br/> <blockquote>${token}</blockquote>`;
      await sendMail({ email, html, subject: "Hoàn tất đăng ký tài khoản" });
    }
    setTimeout(async () => {
      await User.deleteOne({ email: emailedited });
    }, [30000]);
    return res.json({
      success: newUser ? true : false,
      mes: newUser
        ? "Plaese check your email to active account"
        : "Something went wrong",
    });
  }
});
const finalRegister = asyncHandler(async (req, res) => {
  // const cookie = req.cookies;
  const { token } = req.params;
  const notActiveEmail = await User.findOne({ email: new RegExp(`${token}$`) });
  if (notActiveEmail) {
    notActiveEmail.email = atob(notActiveEmail?.email?.split("@")[0]);
    notActiveEmail.save();
  }
  return res.json({
    success: notActiveEmail ? true : false,
    mes: notActiveEmail ? "Tạo tài khoản thành công" : "Code invalid",
  });
});

// Refresh token => Cấp mới access token
// Access token => Xác thực người dùng, quân quyên người dùng
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({
      success: false,
      mes: "Missing inputs",
    });
  // plain object
  const response = await User.findOne({ email });
  if (response && (await response.isCorrectPassword(password))) {
    // Tách password và role ra khỏi response
    const { password, role, refreshToken, ...userData } = response.toObject();
    // Tạo access token
    const accessToken = generateAccessToken(response._id, role);
    // Tạo refresh token
    const newRefreshToken = generateRefreshToken(response._id);
    // Lưu refresh token vào database
    await User.findByIdAndUpdate(
      response._id,
      { refreshToken: newRefreshToken },
      { new: true }
    );
    // Lưu refresh token vào cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({
      success: true,
      accessToken,
      userData,
    });
  } else {
    throw new Error("Invalid credentials!");
  }
});
const getCurrent = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const user = await User.findById(_id)
    .select("-refreshToken -password ")
    .populate({
      path: "cart",
      populate: { path: "product", select: "title thumb price color" },
    })
    .populate("wishlist", "title thumb price color");
  return res.status(200).json({
    success: user ? true : false,
    rs: user ? user : "User not found",
  });
});
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Lấy token từ cookies
  const cookie = req.cookies;
  // Check xem có token hay không
  if (!cookie && !cookie.refreshToken)
    throw new Error("No refresh token in cookies");
  // Check token có hợp lệ hay không
  const rs = await jwt.verify(cookie.refreshToken, process.env.JWT_SECRET);
  const response = await User.findOne({
    _id: rs._id,
    refreshToken: cookie.refreshToken,
  });
  return res.status(200).json({
    success: response ? true : false,
    newAccessToken: response
      ? generateAccessToken(response._id, response.role)
      : "Refresh token not matched",
  });
});

const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie || !cookie.refreshToken)
    throw new Error("No refresh token in cookies");
  // Xóa refresh token ở db
  await User.findOneAndUpdate(
    { refreshToken: cookie.refreshToken },
    { refreshToken: "" },
    { new: true }
  );
  // Xóa refresh token ở cookie trình duyệt
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  return res.status(200).json({
    success: true,
    mes: "Logout is done",
  });
});

// Client gửi email
// Server check email có hợp lệ hay không => Gửi mail + kèm theo link (password change token)
// Client check mail => click link
// Client gửi api kèm token
// Check token có giống với token mà server gửi mail hay không
// Change password

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new Error("Missing email");
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");
  const resetToken = user.createPasswordChangedToken();
  await user.save();

  const html = `Xin vui lòng click vào link dưới đây để thay đổi mật khẩu của bạn.Link này sẽ hết hạn sau 15 phút kể từ bây giờ. <a href=${process.env.CLIENT_URL}/reset-password/${resetToken}>Click here</a>`;

  const data = {
    email,
    html,
    subject: "Forgot Password",
  };
  const rs = await sendMail(data);
  return res.status(200).json({
    success: rs.response?.includes("OK") ? true : false,
    mes: rs.response?.includes("OK")
      ? "Hãy kiểm tra email của bạn"
      : "Đã có lỗi, hãy thử lại",
  });
});
const resetPassword = asyncHandler(async (req, res) => {
  const { password, token } = req.body;
  if (!password || !token) throw new Error("Missing imputs");
  const passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) throw new Error("Invalid reset token");
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordChangedAt = Date.now();
  user.passwordResetExpires = undefined;
  await user.save();
  return res.status(200).json({
    success: user ? true : false,
    mes: user ? "Updated password" : "Something went wrong",
  });
});
const getUsers = asyncHandler(async (req, res) => {
  const queries = { ...req.query };
  //tách các trường đặc biệt ra khỏi query
  const excludeFields = ["limit", "sort", "page", "fields"];
  excludeFields.forEach((el) => delete queries[el]);
  //Format lại các operators cho dúng cú pháp của mongoose
  let queryString = JSON.stringify(queries);
  queryString = queryString.replace(
    /\b(gte|gt|lte|lt)\b/g,
    (match) => `$${match}`
  );
  let formattedQueries = JSON.parse(queryString);
  //Filltering
  if (queries?.name)
    formattedQueries.name = { $regex: queries.name, $options: "i" };

  if (req.query.q) {
    delete formattedQueries.q;
    formattedQueries["$or"] = [
      { firstName: { $regex: req.query.q, $options: "i" } },
      { lastName: { $regex: req.query.q, $options: "i" } },
      { email: { $regex: req.query.q, $options: "i" } },
    ];
  }

  // const query = {};
  // if (req.query.q) {
  //   query = {
  //     $or: [
  //         { name: { $regex: req.query.q, $options: "i" } },
  //         { email: { $regex: req.query.q, $options: "i" } },
  //     ],
  //   };
  // }
  let queryCommand = User.find(formattedQueries);
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
      const counts = await User.find(formattedQueries).countDocuments();
      return res.status(200).json({
        success: response ? true : false,
        counts,
        users: response ? response : "Cannot get users",
      });
    } catch (err) {
      throw new Error(err.message);
    }
  });
});
const deleteUser = asyncHandler(async (req, res) => {
  const { uid } = req.params;
  const response = await User.findByIdAndDelete(uid);
  return res.status(200).json({
    success: response ? true : false,
    mes: response
      ? `User with email ${response.email} deleted`
      : "No user delete",
  });
});
const updateUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { firstName, lastName, email, mobile, address } = req.body;
  const data = { firstName, lastName, email, mobile, address };
  if (req.file) data.avatar = req.file.path;

  if (!_id || Object.keys(req.body).length === 0)
    throw new Error("Missing inputs");
  const response = await User.findByIdAndUpdate(_id, data, {
    new: true,
  }).select("-password -role -refreshToken");
  return res.status(200).json({
    success: response ? true : false,
    mes: response ? "Cập nhật thành công" : "Error",
  });
});
const updateUserByAdmin = asyncHandler(async (req, res) => {
  //
  const { uid } = req.params;
  if (Object.keys(req.body).length === 0) throw new Error("Missing inputs");
  const response = await User.findByIdAndUpdate(uid, req.body, {
    new: true,
  }).select("-password -role -refreshToken");
  return res.status(200).json({
    success: response ? true : false,
    mes: response ? "Updated" : "Some thing went wrong",
  });
});

const updateAddressUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  if (!req.body.address) throw new Error("Missing inputs");
  const response = await User.findByIdAndUpdate(
    _id,
    { $push: { address: req.body.address } },
    {
      new: true,
    }
  ).select("-password -role -refreshToken");
  return res.status(200).json({
    success: response ? true : false,
    mes: response ? response : "Some thing went wrong",
  });
});

const updateCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { pid, quantity = 1, color, price, thumbnail, title } = req.body;
  if (!pid || !color) throw new Error("Missing inputs");
  const user = await User.findById(_id).select("cart");
  const alreadyProduct = user?.cart?.find(
    (el) => el.product.toString() === pid && el.color === color
  );
  if (alreadyProduct) {
    const response = await User.updateOne(
      { cart: { $elemMatch: alreadyProduct } },
      {
        $set: {
          "cart.$.quantity": quantity,
          "cart.$.price": price,
          "cart.$.thumbnail": thumbnail,
          "cart.$.title": title,
        },
      },
      { new: true }
    );
    return res.status(200).json({
      success: response ? true : false,
      mes: response ? "Cập nhật thành công" : "Error",
    });
  } else {
    const response = await User.findByIdAndUpdate(
      _id,
      {
        $push: {
          cart: { product: pid, quantity, color, price, thumbnail, title },
        },
      },
      {
        new: true,
      }
    );
    return res.status(200).json({
      success: response ? true : false,
      mes: response ? "Cập nhật thành công" : "Error",
    });
  }
});
const removeProductInCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { pid, color } = req.params;

  const user = await User.findById(_id).select("cart");
  const alreadyProduct = user?.cart?.find(
    (el) => el.product.toString() === pid && el.color === color
  );
  if (!alreadyProduct) {
    return res.status(200).json({
      success: true,
      mes: "Deleted",
    });
  }
  const response = await User.findByIdAndUpdate(
    _id,
    {
      $pull: { cart: { product: pid, color } },
    },
    {
      new: true,
    }
  );
  return res.status(200).json({
    success: response ? true : false,
    mes: response ? "Cập nhật thành công" : "Error",
  });
});
const updateWishList = asyncHandler(async (req, res) => {
  const { pid } = req.params;
  const { _id } = req.user;
  const user = await User.findById(_id);
  const alreadyWishList = user?.wishlist?.find(
    (el) => el?._id?.toString() === pid
  );

  if (alreadyWishList) {
    const response = await User.findByIdAndUpdate(
      _id,
      {
        $pull: { wishlist: pid },
      },
      { new: true }
    );
    return res.json({
      success: response ? true : false,
      mes: response ? "Updated" : "Error",
    });
  } else {
    const response = await User.findByIdAndUpdate(
      _id,
      {
        $push: { wishlist: pid },
      },
      { new: true }
    );
    return res.json({
      success: response ? true : false,
      mes: response ? "Updated" : "Error",
    });
  }
});
module.exports = {
  register,
  login,
  getCurrent,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  getUsers,
  deleteUser,
  updateUser,
  updateUserByAdmin,
  updateAddressUser,
  updateCart,
  finalRegister,
  removeProductInCart,
  updateWishList,
};