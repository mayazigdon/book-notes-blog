import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from 'axios';

const app = express();
const port = 3000;
const api_key = "AIzaSyBjCR5mPfaKuNk1tVML5Y05LjvyPt7gogk"; 

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Book Notes",
  password: "",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

function getFormattedDate(){
    const today = new Date().toISOString().split("T")[0]; 
    return today;
}

async function getISBN(name){
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=intitle:${name}&key=${api_key}`);
    const isbn = response.data.items[0].volumeInfo.industryIdentifiers[0].identifier;
    return isbn;
}


async function loadALLData(sort){
    let direction = "DESC";
    if(sort === "title"){
        direction = "ASC"
    }
    let data = await db.query(`SELECT book.id, book.title, book.auther, book.isbn, book.date,book.grade,book.summary, note.content FROM book INNER JOIN note ON note.book_id = book.id ORDER BY ${sort} ${direction}`);
    return data.rows;
}

async function getBookById(bookId){
   let book = await db.query(`SELECT book.id, book.title, book.auther, book.isbn, book.date, book.grade, book.summary, note.content 
   FROM book 
   INNER JOIN note ON note.book_id = book.id 
   WHERE book.id = $1`,
  [bookId]);
  return book.rows[0];
}

app.get("/new",(req,res)=>{
    res.render("new_review.ejs");
});

app.post("/add",async(req,res)=>{
    console.log(req.body);
    const book = req.body; 
    const date = getFormattedDate();
    const isbn = await getISBN(book.title);

    try{
        const result = await db.query("INSERT INTO book (title,auther,isbn,date,grade,summary) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[book.title, book.auther, isbn, date, book.grade,book.summary]);
        const id = parseInt(result.rows[0].id);
        console.log(result.rows[0].id);
        try{
            await db.query("INSERT INTO note (content,book_id) VALUES($1,$2)",[book.notes,id]);
        }catch(err){
            console.log(err);
        }
    }catch(err){
        console.log(err);
    }
   
    res.redirect("/");
});

app.post("/delete",async(req,res)=>{
    try{
        await db.query(`DELETE FROM note WHERE book_id = ${req.body.id}`);

        try{
            await db.query(`DELETE FROM book WHERE id = ${req.body.id}`);
        }catch(err){
            console.log(err);
        }
    }catch(err){
        console.log(err);
    }
    res.redirect("/");
});

app.post("/sort",async(req,res)=>{
    let order = req.body.sort;
    let data = await loadALLData(order);
    res.render("index.ejs",{data:data});
});

app.post("/readNotes",async(req,res)=>{
    let book = await getBookById(req.body.id)
    res.render("full_review.ejs",{book : book});
});

app.get("/",async(req,res)=>{
    let defaultSort = "date";
    let data = await loadALLData(defaultSort);
    res.render("index.ejs",{data:data});
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  