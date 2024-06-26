import { convertToMMDDYY } from '/Bus Operator/utils/Utils.js';

import firebaseConfig from '/CONFIG.js';
import { DBPaths } from '/Bus Operator/js/DB.js';

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const myData = JSON.parse(sessionStorage.getItem('currentUser'));

const table = document.getElementById("applicant-table");
const busOrgContainer = document.querySelector('.bus-op-content');

let busOpArray = [];

document.addEventListener('DOMContentLoaded', generateBusOperators);

function generateBusOperators() {

    busOrgContainer.innerHTML = "";
    busOpArray = [];

    const opRef = database.ref(`${DBPaths.BUS_DRIVERS}`);

    opRef.once('value',
        (snapshot) => {
            snapshot.forEach((op) => {

                const opKey = op.key;
                const opData = op.val();
                opData["key"] = opKey;

                busOpArray.push(opData);
                createBusDriversCard(opData);
            });

            getSnapshotCounts((error, counts) => {
                if (error) {
                    console.error("Error fetching snapshot counts:", error);
                } else {

                    const passengerCount = counts[0];
                    const busDriversCount = counts[1];
                    const empCount = counts[2];

                    generateChart(passengerCount, busDriversCount, empCount);
                    generateEmployeeTable();
                }
            });
        }
    )

}

function createBusDriversCard(opData) {
    const parentDiv = document.querySelector('.bus-op-content');
    const busDriver = opData.fullName;

    // Create the elements
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('dashboard-items');

    cardDiv.textContent = busDriver;

    // cardDiv.addEventListener('click', showCoopModal.bind(null, key));

    // Append the cardDiv to the parent div with class bus-coop-container
    parentDiv.appendChild(cardDiv);
}

function getSnapshotCounts(callback) {
    const opRef1 = database.ref(`${DBPaths.PASSENGERS}`);
    const opRef2 = database.ref(`${DBPaths.BUS_DRIVERS}`);
    const opRef3 = database.ref(`${DBPaths.EMPLOYEES}`);

    // Array to store promises for each operation
    const promises = [];

    // Push promises for each operation into the array
    promises.push(opRef1.once('value'));
    promises.push(opRef2.once('value'));
    promises.push(opRef3.once('value'));

    // Use Promise.all to execute all promises concurrently
    Promise.all(promises)
        .then(snapshots => {
            // Extract counts from each snapshot
            const counts = snapshots.map(snapshot => snapshot.numChildren());

            // Call the callback function with the counts array
            callback(null, counts);
        })
        .catch(error => {
            // Handle any errors
            callback(error, null);
        });
}

function generateChart(passengerCount, busDriversCount, empCount) {

    const ctx = document.getElementById('myChart');
    const totalAlertFontSize = 40;

    const data = {
        labels: ['Bus Drivers', 'Passengers/Jobseeker', 'Employees'],
        datasets: [{
            data: [busDriversCount, passengerCount, empCount]
        }]
    };

    const noDataTextDisplayPlugin = {
        afterDraw: (chart) => {

            const { ctx, data } = chart;
            const currentDataLength = data.datasets[0].data.length;
            const currentDataValue = data.datasets[0].data[0];

            //Check if dataset is empty
            if (currentDataLength === 0 || currentDataValue === 0) {
                const {
                    chartArea: { left, top, right, bottom },
                    ctx,
                    scales: { x },
                } = chart;

                //Locate and get the center axis of Canvas
                const centerX = (left + right) / 2;
                const centerY = (top + bottom) / 2;
                ctx.save();

                //Message Property
                ctx.textAlign = 'center';
                ctx.font = '50px Arial';
                ctx.fillStyle = 'black';
                ctx.textBaseline = 'middle';
                ctx.fillText('No Data', centerX, centerY);
                ctx.restore();
            }
        },
    };

    const centerTotalAlertText = {
        beforeDatasetsDraw: (chart) => {

            const { ctx, data } = chart;

            const currentDataValue = data.datasets[0].data[0];

            //Check if dataset is empty
            if (currentDataValue !== 0) {
                //Get the total of Alert data
                const alertData = data.datasets[0].data;
                const sum = alertData.reduce((accumulator, currentValue) => accumulator + currentValue, 0);

                ctx.save;

                //Locate and get the center axis of Canvas
                const xCoor = chart.getDatasetMeta(0).data[0].x;
                const yCoor = chart.getDatasetMeta(0).data[0].y;

                // Display the total alert data
                ctx.fillStyle = 'black';
                ctx.font = `bold ${totalAlertFontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(sum, xCoor, yCoor);
            }
        }
    }

    //Config block
    const config = {
        type: 'doughnut',
        data: data,
        options: {
            cutout: '65%',
            borderWidth: 0,
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                colors: {
                    forceOverride: true
                }
            }
        },
        plugins: [
            noDataTextDisplayPlugin,
            centerTotalAlertText
        ]
    };

    new Chart(ctx, config);
}

function generateEmployeeTable() {

    const opRef3 = database.ref(`${DBPaths.APPLICATIONS_HISTORY}`);

    opRef3.once('value',
        (snapshots) => {
            snapshots.forEach(applicant => {

                const role = applicant.val().type;
                const id = applicant.key;
                const empData = applicant.val()

                if (empData.companyName === myData.companyName) {
                    createEmployeeTable(empData);
                }

            });
        })
        .catch(error => {
            // Handle any errors
            callback(error, null);
        });
}

function createEmployeeTable(empData) {
    /// Get the data from the snapshot
    //  const data = childSnapshot.val();

    // Create a new table row
    const row = document.createElement("tr");

    // Create table cells and set their content
    const fullNameCell = document.createElement("td");
    fullNameCell.textContent = empData.fullName;
    row.appendChild(fullNameCell);

    const positionCell = document.createElement("td");
    positionCell.textContent = empData.position;
    row.appendChild(positionCell);

    const hiredDateCell = document.createElement("td");
    // hiredDateCell.textContent = applicant.hiredDate;
    hiredDateCell.textContent = convertToMMDDYY(empData.date);
    row.appendChild(hiredDateCell);

    // Append the row to the table
    table.appendChild(row);
}

function getUserDetails(role, id) {

    const ref = database.ref(`${DBPaths.BUS_DRIVERS}`);

    // Perform a query to search for the value
    ref.orderByChild('driverId').equalTo(id).once('value')
        .then(snapshot => {
            // Iterate over the results
            snapshot.forEach(childSnapshot => {
                /// Get the data from the snapshot
                const data = childSnapshot.val();

                // Create a new table row
                const row = document.createElement("tr");

                // Create table cells and set their content
                const fullNameCell = document.createElement("td");
                fullNameCell.textContent = data.fullName;
                row.appendChild(fullNameCell);

                const positionCell = document.createElement("td");
                positionCell.textContent = role;
                row.appendChild(positionCell);

                const hiredDateCell = document.createElement("td");
                // hiredDateCell.textContent = applicant.hiredDate;
                hiredDateCell.textContent = 'N/A';
                row.appendChild(hiredDateCell);

                // Append the row to the table
                table.appendChild(row);
            });
        })
        .catch(error => {
            // Handle any errors
            console.error("Error searching for snapshot:", error);
        }
        );

}
