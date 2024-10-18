async function trySwitch(status) {
    switch (status) {
        case 'opened':
            return 1
        case 'closed':
            await new Promise(r => setTimeout(r, 1000));
            return 3
    }
}

console.log(trySwitch('opened'));