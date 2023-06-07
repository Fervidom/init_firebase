async function myFunction (): Promise<string> {
    try {
        /* await esperar por el resultado de la promesa y lo desenvuelve en el tipo de valor que es.
        en este caso la promesa regresa un numero.
        No debemos usar el .then para trabajar con el resultado de la promesa.*/ 
        const rank = await getRank()

        // la palabra async esta forzando a retornar una promesa.
        return "firebase" + rank;
        /* pero tambien podemos expresar explicitamente el promise en el return.
        return Promise.resolve("Firebase");
        no marcara error de ninguna de las dos formas.*/
    } catch (err){
        return "Error: " + err;
    }
    
}

function getRank() {
    return Promise.resolve(1);
}