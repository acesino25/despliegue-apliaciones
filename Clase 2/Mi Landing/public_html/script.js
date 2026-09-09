async function fetchData(){
    const url = 'http://localhost:8090/api/collections/alumnos/records?perPage=50'

    try{
        const response = await fetch(url);

        if (!response.ok) throw new Error(`HTTP Error: Se ha producido el siguiente código de error ${response.status}`);

        const data = await response.json();

        const lista = document.getElementById('lista-alumnos');

        data.items.forEach(alumno => {
            const li = document.createElement('li');
            li.textContent = alumno.nombre;

            lista.appendChild(li);
        });
        
    }catch(error)
    {
        console.log('Error al buscar:', error.message);
    }
}

fetchData();

/*
Ejemplo de devolución de respuesta para el siguiente endpoint:

request: http://localhost:8090/api/collections/alumnos/records?perPage=50'
{
    "items": [
        {
            "collectionId": "pbc_3482769729",
            "collectionName": "alumnos",
            "created": "2026-09-09 12:20:22.020Z",
            "id": "bmhkureu236bkqp",
            "nombre": "Nombre y Apellido",
            "updated": "2026-09-09 12:20:22.020Z"
        }
    ],
    "page": 1,
    "perPage": 50,
    "totalItems": 1,
    "totalPages": 1
}
*/