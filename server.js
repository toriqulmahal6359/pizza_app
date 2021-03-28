require('dotenv').config()

const express = require('express')
const app = express()

const ejs = require('ejs')
const expressLayout = require('express-ejs-layouts')
const path = require('path')

const session = require('express-session')
const flash = require('express-flash')

const mongoose = require('mongoose')
const MongoStore = require('connect-mongo')

const passport = require('passport')

const Emitter = require('events')

//Database Connection
const url = 'mongodb://localhost/pizza';
mongoose.connect(url, {useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: true});
const connection = mongoose.connection;
connection.once('open', () => {
    console.log('Database Connected Successfully...');
}).catch(err => {
    console.log('Connection Failed...');
});

//Session store
// let mongoStore = new MongoDbStore({
//     mongooseConnection: connection,
//     collection: 'sessions',
// }) 

//Event Emitter
const eventEmitter = new Emitter()
app.set('eventEmitter', eventEmitter)

//Session config
app.use(session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    store: MongoStore.create({
        mongoUrl: url,
        collectionName: 'sessions',
        //ttl: 60, 
    }),
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, //1 hr //(1000 * 60 * 60 * 24 [24 hrs])
}))

//Session flash
app.use(flash())

//assets
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

//Passport config
const passportInit = require('./app/config/passport')
passportInit(passport)
app.use(passport.initialize())
app.use(passport.session())

//Global Middleware
app.use((req, res, next) => {
    res.locals.session = req.session
    res.locals.user = req.user
    next()
})

//set Template Engine
app.use(expressLayout);
app.set('views', path.join(__dirname, "/resources/views"))
app.set('view engine', 'ejs')

require('./routes/web.js')(app)

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
    console.log(`Listening on Port ${PORT}`)
})

//socket
const io = require('socket.io')(server)
io.on('connection', (socket) => {
    //join
    console.log(socket.id)
    socket.on('join', (orderId) => {
        console.log(orderId)
        socket.join(orderId)
    })
    
})

eventEmitter.on('orderUpdated', (data) => {
    io.to(`order_${data.id}`).emit('orderUpdated', data)
})

eventEmitter.on('orderPlaced', (data) => {
    io.to('adminRoom').emit('orderPlaced', data)
})