const router = require("express").Router();
const ctrls = require("../controllers/order");
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken");

router.post("/", verifyAccessToken, ctrls.createOrder);
router.put(
  "/status/:oid",
  [verifyAccessToken, isAdmin],
  ctrls.updateStatusOrder
);

router.get("/admin", [verifyAccessToken, isAdmin], ctrls.getOrder);
router.delete("/:oid", [verifyAccessToken, isAdmin], ctrls.deleteOrder);
router.get("/", verifyAccessToken, ctrls.getUserOrder);

module.exports = router;
