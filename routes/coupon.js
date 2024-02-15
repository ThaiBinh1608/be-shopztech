const router = require("express").Router();
const ctrls = require("../controllers/coupon");
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken");
router.get("/", ctrls.getCoupons);
router.post("/", [verifyAccessToken, isAdmin], ctrls.createNewCoupon);
router.put("/:cid", [verifyAccessToken, isAdmin], ctrls.updateCoupon);
router.delete("/:cid", [verifyAccessToken, isAdmin], ctrls.deleteCoupon);

module.exports = router;
