function sumOfMultiples(f, m) {
    let sum = 0;

    for (let i = 0; i < m.length; i++) {
        for (let j = 0; j < f.length; j++) {
            if (m[i] % f[j] === 0) {
                sum += m[i];
                break;
            }
        }
    }

    return sum;
}

function calculate(){
    const fInput = document.getElementById("fArray").value;
    const mInput = document.getElementById("mArray").value;

    const f = fInput.split(',');
    const m = mInput.split(',');

    for(let i = 0; i< m.length ; i++){
        m[i]=Number(m[i]);
    }

    for(let i = 0; i< f.length ; i++){
        f[i]=Number(f[i]);
    }

    const result = sumOfMultiples(f,m);

    document.getElementById("result").innerText = "sum of multiples: " + result;
}
