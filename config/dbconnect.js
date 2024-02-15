const { default: mongoose } = require("mongoose");
const dbConnect = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_DB ||
        "mongodb+srv://zuesgod1608:7KwqYJ2qsXnY2FJK@cluster0.jlg9goc.mongodb.net/"
    );
    if (conn.connection.readyState === 1) console.log(" DB connect success");
    else console.log("connect failed");
  } catch (error) {
    console.log("DB connect failed: ");
    throw new Error(error);
  }
};

module.exports = dbConnect;
