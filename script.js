function parseInput() {
    const cities = document.getElementById("cities").value.split(',').map(c => c.trim());
    const distanceLines = document.getElementById("distances").value.trim().split('\n');
    const distances = distanceLines.map(line => {
        const [city1, city2, distance, packages] = line.split(',').map(x => x.trim());
        return { city1, city2, distance: parseFloat(distance), packages: parseInt(packages) };
    });
    const numChargers = parseInt(document.getElementById("chargers").value);
    return { cities, distances, numChargers };
}

function buildGraph(cities, distances) {
    let graph = new Map();
    cities.forEach(city => graph.set(city, []));
    distances.forEach(({ city1, city2, distance, packages }) => {
        if (distance <= 300) {
            graph.get(city1).push({ city: city2, distance, packages });
            graph.get(city2).push({ city: city1, distance, packages });
        }
    });
    return graph;
}

function bfsWithin150km(graph, start) {
    let visited = new Set();
    let queue = [{ city: start, distance: 0 }];
    visited.add(start);
    while (queue.length > 0) {
        const { city, distance } = queue.shift();
        graph.get(city).forEach(neighbor => {
            if (!visited.has(neighbor.city) && distance + neighbor.distance <= 150) {
                queue.push({ city: neighbor.city, distance: distance + neighbor.distance });
                visited.add(neighbor.city);
            }
        });
    }
    return visited;
}

function findBestCitiesForChargers(cities, distances, numChargers) {
    const graph = buildGraph(cities, distances);
    let bestCities = [];
    let maxPackages = 0;
    let bestConnectedCities = {};

    function calculatePackages(connectedCities) {
        let totalPackages = 0;
        distances.forEach(({ city1, city2, packages }) => {
            if (connectedCities.has(city1) && connectedCities.has(city2)) {
                totalPackages += packages;
            }
        });
        return totalPackages;
    }

    function findMinChargers() {
        let chargers = 0;
        let allCities = new Set(cities);
        let coveredCities = new Set();
        while (coveredCities.size < cities.length) {
            let maxCoverage = 0;
            let bestCity = null;
            let bestCoverage = new Set();

            cities.forEach(city => {
                const connectedCities = bfsWithin150km(graph, city);
                let newCoverage = new Set([...connectedCities].filter(c => !coveredCities.has(c)));
                if (newCoverage.size > maxCoverage) {
                    maxCoverage = newCoverage.size;
                    bestCity = city;
                    bestCoverage = newCoverage;
                }
            });

            if (bestCity) {
                chargers++;
                coveredCities = new Set([...coveredCities, ...bestCoverage]);
            } else {
                break;
            }
        }
        return chargers;
    }

    const combinations = (arr, k) => {
        let i, subI, ret = [], sub, next;
        for (i = 0; i < arr.length; i++) {
            if (k === 1) {
                ret.push([arr[i]]);
            } else {
                sub = combinations(arr.slice(i + 1, arr.length), k - 1);
                for (subI = 0; subI < sub.length; subI++) {
                    next = sub[subI];
                    next.unshift(arr[i]);
                    ret.push(next);
                }
            }
        }
        return ret;
    };

    const cityCombinations = combinations(cities, numChargers);
    cityCombinations.forEach(combination => {
        let connected = new Set();
        let currentConnectedCities = {};
        combination.forEach(city => {
            const connectedCities = bfsWithin150km(graph, city);
            currentConnectedCities[city] = Array.from(connectedCities);
            connectedCities.forEach(c => connected.add(c));
        });
        const totalPackages = calculatePackages(connected);
        if (totalPackages > maxPackages) {
            maxPackages = totalPackages;
            bestCities = combination;
            bestConnectedCities = currentConnectedCities;
        }
    });

    const minChargers = findMinChargers();

    return { bestCities, maxPackages, bestConnectedCities, minChargers };
}

function drawGraph(cities, distances, bestCities) {
    const cy = cytoscape({
        container: document.getElementById('graph'),
        elements: [],
        style: [
            { selector: 'node', style: { 'label': 'data(id)', 'background-color': 'data(color)' } },
            { selector: 'edge', style: { 'label': 'data(label)', 'width': 2, 'line-color': '#ddd' } }
        ],
        layout: { name: 'grid' }
    });

    cities.forEach(city => {
        cy.add({ group: 'nodes', data: { id: city, color: bestCities.includes(city) ? 'green' : 'blue' } });
    });

    distances.forEach(({ city1, city2, distance, packages }) => {
        if (distance <= 300) {
            cy.add({ group: 'edges', data: { id: `${city1}-${city2}`, source: city1, target: city2, label: `${packages} pkgs` } });
        }
    });

    cy.layout({ name: 'cose' }).run();
}

function solve() {
    const { cities, distances, numChargers } = parseInput();
    const { bestCities, maxPackages, bestConnectedCities, minChargers } = findBestCitiesForChargers(cities, distances, numChargers);

    let resultHTML = `Best cities for chargers: ${bestCities.join(', ')}<br>Maximum packages: ${maxPackages}<br>`;
    bestCities.forEach(city => {
        resultHTML += `<br>Connected cities for ${city}: ${bestConnectedCities[city].join(', ')}`;
    });
    resultHTML += `<br><br>Minimum necessary chargers to connect all cities: ${minChargers}`;

    document.getElementById("result").innerHTML = resultHTML;
    drawGraph(cities, distances, bestCities);
}
