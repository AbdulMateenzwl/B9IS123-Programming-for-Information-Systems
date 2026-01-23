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


const f = [2, 3];
const m = [4, 5, 6, 7, 9];

console.log(sumOfMultiples(f, m)); 
