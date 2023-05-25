const express = require("express");
const multer = require("multer");
const path = require("path");
const tesseract = require("node-tesseract-ocr");

const app = express();
const PORT = 8090;

app.use(express.static(path.join(__dirname + "/uploads")));
app.set("view engine", "ejs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.render("index", { data: "" });
});

app.post("/extracttextfromimage", upload.single("file"), (req, res) => {
  console.log(req.file.path);

  const config = {
    lang: "eng",
    oem: 1,
    psm: 3,
  };

  tesseract
    .recognize(req.file.path, config)
    .then((text) => {
      console.log("Result:", text);

      // Extract amounts for subtotal, HST, and total
      const amounts = extractAmounts(text, ["Subtotal", "HST", "Total"]);

      console.log("Amounts:", amounts);

      res.render("index", {
        data: text,
        amounts: {
          Subtotal: amounts.Subtotal,
          HST: amounts.HST,
          Total: amounts.Total ? amounts.Total : null,
        },
      });
    })
    .catch((error) => {
      console.log(error.message);
    });
});

function extractAmounts(text) {
  const amounts = {};

  const patterns = {
    Subtotal: /Subtotal\s*\$\s*([\d.]+)/i,
    HST: /HST\s*\d+%\s*\$\s*([\d.]+)/i,
  };

  Object.entries(patterns).forEach(([keyword, pattern]) => {
    const match = text.match(pattern);

    if (match && match[1]) {
      amounts[keyword] = parseFloat(match[1].replace(/,/g, ""));
    } else {
      amounts[keyword] = null;
    }
  });

  if (amounts.Subtotal !== null && amounts.HST !== null) {
    amounts.Total = amounts.Subtotal + amounts.HST;
  } else {
    amounts.Total = null;
  }

  return amounts;
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
