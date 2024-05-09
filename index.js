const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/", async (req, res) => {
  res.send("server is running");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
