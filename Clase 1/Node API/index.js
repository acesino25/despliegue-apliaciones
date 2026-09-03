const express = require('express')
const app = express()

app.get('/api/hola/', (req, res) =>{
    res.json({message: 'Hello world'});
})

app.listen(3000, () => console.log('Express corriendo en puerto 3000'))