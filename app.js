// ======================================
// 1. CONNECT TO SUPABASE
// ======================================

const SUPABASE_URL = 'https://jjtcskinsucriryykmrh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EC-31NQc-Bkp99tzFXVhkg_kCSvnYva';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// ======================================
// 2. GENERAL FUNCTIONS
// ======================================

function showMessage(id, message, isError = false) {
    const element = document.getElementById(id);

    element.textContent = message;
    element.style.color = isError ? "#dc2626" : "#166534";
}

function showSliderValue(inputId, textId) {
    const value = document.getElementById(inputId).value;

    document.getElementById(textId).textContent = value;
}


// ======================================
// 3. LOAD MASTER DATA
// ======================================

async function loadMasterData() {

    await loadGreenhouses();
    await loadDevices();

}


// LOAD GREENHOUSES

async function loadGreenhouses() {

    const { data, error } = await supabaseClient
        .from("greenhouses")
        .select("*")
        .order("GreenhouseID", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const select = document.getElementById("deviceGreenhouse");

    select.innerHTML = '<option value="">เลือกโรงเรือน</option>';

    data.forEach(item => {

        const option = document.createElement("option");

        option.value = item.GreenhouseID;
        option.textContent = item.GreenhouseName;

        select.appendChild(option);

    });


    const table = document.getElementById("greenhouseTable");

    table.innerHTML = "";

    data.forEach(item => {

        table.innerHTML += `
            <tr>
                <td>${item.GreenhouseID}</td>
                <td>${item.GreenhouseName}</td>
                <td>${item.PlantType}</td>
                <td>${item.Area ?? "-"}</td>
            </tr>
        `;

    });

}


// LOAD DEVICES

async function loadDevices() {

    const { data, error } = await supabaseClient
        .from("devices")
        .select("*, greenhouses(GreenhouseName)")
        .order("DeviceID", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const sensorSelect = document.getElementById("sensorDevice");
    const actuatorSelect = document.getElementById("actuatorDevice");

    sensorSelect.innerHTML = '<option value="">เลือก Sensor</option>';
    actuatorSelect.innerHTML = '<option value="">เลือก Actuator</option>';

    const table = document.getElementById("deviceTable");

    table.innerHTML = "";

    data.forEach(item => {

        const option = document.createElement("option");

        option.value = item.DeviceID;
        option.textContent = item.DeviceName;

        if (item.DeviceType === "sensor") {
            sensorSelect.appendChild(option);
        }

        if (item.DeviceType === "actuator") {
            actuatorSelect.appendChild(option.cloneNode(true));
        }

        const row = document.createElement("tr");

        const cells = [
            item.DeviceID,
            item.DeviceName,
            item.DeviceType,
            item.greenhouses?.GreenhouseName ?? "-"
        ];

        cells.forEach(value => {
            const td = document.createElement("td");
            td.textContent = value;
            row.appendChild(td);
        });

        table.appendChild(row);

    });

}


// ======================================
// 4. ADD GREENHOUSE
// ======================================

async function addGreenhouse() {

    const name = document.getElementById("greenhouseName").value.trim();
    const plant = document.getElementById("plantType").value.trim();
    const areaText = document.getElementById("area").value;

    if (!name || !plant) {
        alert("กรุณากรอกชื่อโรงเรือนและชนิดพืช");
        return;
    }

    const area = areaText === "" ? null : Number(areaText);

    if (area !== null && (!Number.isFinite(area) || area < 0)) {
        alert("พื้นที่ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
        return;
    }

    const { error } = await supabaseClient
        .from("greenhouses")
        .insert([{
            GreenhouseName: name,
            PlantType: plant,
            Area: area
        }]);

    if (error) {
        alert("เพิ่มโรงเรือนไม่สำเร็จ: " + error.message);
        return;
    }

    alert("เพิ่มโรงเรือนสำเร็จ!");

    document.getElementById("greenhouseName").value = "";
    document.getElementById("plantType").value = "";
    document.getElementById("area").value = "";

    await loadGreenhouses();

}


// ======================================
// 5. ADD DEVICE
// ======================================

async function addDevice() {

    const name = document.getElementById("deviceName").value.trim();
    const greenhouse = document.getElementById("deviceGreenhouse").value;
    const type = document.getElementById("deviceType").value;
    const gpio = document.getElementById("gpioPin").value.trim();
    const date = document.getElementById("installDate").value;

    if (!name || !greenhouse) {
        alert("กรุณากรอกชื่ออุปกรณ์และเลือกโรงเรือน");
        return;
    }

    const device = {
        GreenhouseID: Number(greenhouse),
        DeviceName: name,
        DeviceType: type,
        GPIOPin: gpio || null,
        InstallDate: date || null
    };

    const { error } = await supabaseClient
        .from("devices")
        .insert([device]);

    if (error) {
        alert("เพิ่มอุปกรณ์ไม่สำเร็จ: " + error.message);
        return;
    }

    alert("เพิ่มอุปกรณ์สำเร็จ!");

    document.getElementById("deviceName").value = "";
    document.getElementById("gpioPin").value = "";

    await loadDevices();

}


// ======================================
// 6. SEND SENSOR DATA (INSERT)
// ======================================

async function sendSensorData() {

    const deviceID = document.getElementById("sensorDevice").value;

    const temperature = Number(document.getElementById("temperature").value);
    const humidity = Number(document.getElementById("humidity").value);
    const light = Number(document.getElementById("lightValue").value);
    const vr = Number(document.getElementById("vrValue").value);

    if (!deviceID) {
        alert("กรุณาเลือก Sensor");
        return;
    }

    if (
        !Number.isFinite(temperature) ||
        temperature < -99.99 ||
        temperature > 999.99 ||
        !Number.isFinite(humidity) ||
        humidity < 0 ||
        humidity > 100
    ) {
        alert("กรุณาตรวจสอบค่าอุณหภูมิและความชื้น");
        return;
    }

    const sensorData = {
        DeviceID: Number(deviceID),
        Temperature: temperature,
        Humidity: humidity,
        LightValue: light,
        VRValue: vr
    };

    const { error } = await supabaseClient
        .from("sensor_logs")
        .insert([sensorData]);

    if (error) {
        showMessage("sensorMessage", error.message, true);
        return;
    }

    showMessage("sensorMessage", "ส่งข้อมูล Sensor สำเร็จ!");

    await loadHistory();

}


// ======================================
// 7. CONTROL PUMP
// ======================================

async function controlPump(action) {

    const deviceID = document.getElementById("actuatorDevice").value;

    if (!deviceID) {
        alert("กรุณาเลือกอุปกรณ์ Actuator");
        return;
    }

    const { error } = await supabaseClient
        .from("actuator_logs")
        .insert([{
            DeviceID: Number(deviceID),
            Action: "PUMP_" + action
        }]);

    if (error) {
        showMessage("controlMessage", error.message, true);
        return;
    }

    showMessage(
        "controlMessage",
        action === "ON"
            ? "บันทึกคำสั่งเปิดปั๊มน้ำแล้ว"
            : "บันทึกคำสั่งปิดปั๊มน้ำแล้ว"
    );

    await loadHistory();

}


// ======================================
// 8. CONTROL LED
// ======================================

async function setLedBrightness() {

    const deviceID = document.getElementById("actuatorDevice").value;

    const brightness = Number(
        document.getElementById("ledBrightness").value
    );

    if (!deviceID) {
        alert("กรุณาเลือกอุปกรณ์ Actuator");
        return;
    }

    const { error } = await supabaseClient
        .from("actuator_logs")
        .insert([{
            DeviceID: Number(deviceID),
            Action: "LED_BRIGHTNESS:" + brightness
        }]);

    if (error) {
        showMessage("controlMessage", error.message, true);
        return;
    }

    showMessage(
        "controlMessage",
        "บันทึกความสว่าง LED " + brightness + "% สำเร็จ"
    );

    await loadHistory();

}


// ======================================
// 9. LOAD SENSOR & ACTUATOR HISTORY
// ======================================

async function loadHistory() {

    const { data: sensorData, error: sensorError } =
        await supabaseClient
            .from("sensor_logs")
            .select("*")
            .order("RecordedAt", { ascending: false })
            .limit(10);

    if (sensorError) {
        showMessage("sensorHistory", sensorError.message, true);
    } else {

        const sensorHistory = document.getElementById("sensorHistory");

        sensorHistory.innerHTML = "";

        if (sensorData.length === 0) {
            sensorHistory.textContent = "ยังไม่มีข้อมูล Sensor";
        }

        sensorData.forEach(item => {

            const div = document.createElement("div");

            div.className = "log-item";

            div.textContent =
                `Device ${item.DeviceID} | ` +
                `อุณหภูมิ ${item.Temperature ?? "-"} °C | ` +
                `ความชื้น ${item.Humidity ?? "-"}% | ` +
                `LDR ${item.LightValue ?? "-"} | ` +
                `VR ${item.VRValue ?? "-"} | ` +
                `${item.RecordedAt}`;

            sensorHistory.appendChild(div);

        });

    }


    const { data: actuatorData, error: actuatorError } =
        await supabaseClient
            .from("actuator_logs")
            .select("*")
            .order("RecordedAt", { ascending: false })
            .limit(10);

    if (actuatorError) {
        showMessage("actuatorHistory", actuatorError.message, true);
    } else {

        const actuatorHistory = document.getElementById("actuatorHistory");

        actuatorHistory.innerHTML = "";

        if (actuatorData.length === 0) {
            actuatorHistory.textContent = "ยังไม่มีข้อมูล Actuator";
        }

        actuatorData.forEach(item => {

            const div = document.createElement("div");

            div.className = "log-item";

            div.textContent =
                `Device ${item.DeviceID} | ` +
                `คำสั่ง: ${item.Action} | ` +
                `${item.RecordedAt}`;

            actuatorHistory.appendChild(div);

        });

    }

}


// ======================================
// 10. START APPLICATION
// ======================================

async function initializeApp() {

    await loadMasterData();
    await loadHistory();

}

initializeApp();
