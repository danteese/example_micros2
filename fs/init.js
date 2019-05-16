load('api_config.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_net.js');
load('api_sys.js');
load('api_adc.js');
load('api_timer.js');
load('api_dht.js');
load('api_arduino_onewire.js');
load('api_arduino_dallas_temp.js');

ADC.enable(0);
let trig = 16;
let dmux1=12;
let dmux2=13;
let dmux3=15;
let pin = 5;
let pin2 = 2;
let pind = 4;
let pind2 = 0;

let message;
let topic;
let coeficiente_lineal = 100.0/1024.0;
let arreglo=['000','001','010','011','100','101','110','111'];
let modelos = ["TEMT6_99_0","TEMT6_99_1","SOILH_99_2","SOILH_99_3","GYML8_99_4","FOTOR_99_5","FOTOR_99_6","FOTOR_99_7"];
let sensores ={
  '000':'LX_',
  '001':'LX_',
  '010':'SL_',
  '011':'SL_',
  '100':'UV_',
  '101':'FOTO_LX',
  '110':'FOTO_LX',
  '111':'FOTO_LX'
}; 

// GPIO.set_mode(0,GPIO.MODE_INPUT);
GPIO.set_mode(trig, GPIO.MODE_OUTPUT);
GPIO.set_mode(dmux1, GPIO.MODE_OUTPUT);
GPIO.set_mode(dmux2, GPIO.MODE_OUTPUT);
GPIO.set_mode(dmux3, GPIO.MODE_OUTPUT);
GPIO.write(trig, 1);
let dht = DHT.create(pind, DHT.DHT11);
let dht2 = DHT.create(pind2, DHT.DHT11);

// Initialize 1-Wire bus
let ow = OneWire.create(pin);
let ow2 = OneWire.create(pin2);
// Initialize DallasTemperature library
let dt = DallasTemperature.create(ow);
let dt2 = DallasTemperature.create(ow2);
// Start up the library
dt.begin();
dt2.begin();
// Number of sensors found on the 1-Wire bus
let n = 0;
let m = 0;
// Sensors addresses
let sens = [];
let sens2 = [];

Timer.set(10000 /* 1 sec */, true /* repeat */, function() {
  for (let i = 0; i < 8; i++) {
    topic = "/ibero/02/";
    GPIO.write(dmux1,(i & 4)? 1:0);
    GPIO.write(dmux2,(i & 2)? 1:0);
    GPIO.write(dmux3,(i & 1)? 1:0);
    print("CANAL: ",(i & 4)? 1:0,(i & 2)? 1:0,(i & 1)? 1:0,"Analogo: ",ADC.read(0));
    let a = sensores[arreglo[i]];
    if (a === 'LX_') {
      message = JSON.stringify(ADC.read(0) * coeficiente_lineal);
      topic = topic+'LX_'+modelos[i];
      print('LX_');
    }else if (a === 'SL_') {
      message = JSON.stringify(getPctje(ADC.read(0), 1023, 950));
      topic = topic+'SL_'+modelos[i];
      print('SL_');
    }else if(a === 'UV_'){
      message = JSON.stringify(((3.3 * ADC.read(0)/1023) - 0.99) * (15.0 - 0.0) / (2.9 - 0.99) + 0.0);
      topic = topic+'UV_'+modelos[i];
      print('UV_');
    }else if(a === 'FOTO_LX'){
      message = JSON.stringify(100-(ADC.read(0) * coeficiente_lineal));
      topic = topic+'LX_'+modelos[i];
      print('FOTO_LX');
    }else{
      print('No sensor');
    }
  print(topic);
  print(message);
  let ok = MQTT.pub(topic, message, 2);
  print('Published:', ok ? 'yes' : 'no', 'topic:', topic, 'message:', message);
  }
  if (n === 0) {
    n = dt.getDeviceCount();
    print('Sensors found:', n);

    for (let i = 0; i < n; i++) {
      sens[i] = '01234567';
      if (dt.getAddress(sens[i], i) === 1) {
        print('Sensor#', i, 'address:', dt.toHexStr(sens[i]));
      }
    }
  }

  dt.requestTemperatures();
  for (let i = 0; i < n; i++) {
    topic = "/ibero/02/";
    print('Sensor#', i, 'Temperature:', dt.getTempC(sens[i]), '*C');
    topic = topic+'TE_18B20_'+JSON.stringify(pin)+'_'+JSON.stringify(i);
    message = JSON.stringify(dt.getTempC(sens[i]));
    let ok = MQTT.pub(topic, message, 2);
    print('Published:', ok ? 'yes' : 'no', 'topic:', topic, 'message:', message);
  }

  if (m === 0) {
    m = dt2.getDeviceCount();
    print('Sensors found:', m);

      sens2[0] = '01234567';
      if (dt.getAddress(sens2[0], 0) === 1) {
        print('Sensor#', 0, 'address:', dt2.toHexStr(sens2[0]));
      }
  
  }

  dt2.requestTemperatures();
    topic = "/ibero/02/";
    print('Sensor#', 0, 'Temperature:', dt2.getTempC(sens2[0]), '*C');
    topic = topic+'TE_18B20_'+JSON.stringify(pin2)+'_'+JSON.stringify(0);
    message = JSON.stringify(dt2.getTempC(sens2[0]));
    let ok = MQTT.pub(topic, message, 2);
    print('Published:', ok ? 'yes' : 'no', 'topic:', topic, 'message:', message);

  let t = dht.getTemp();
  let h = dht.getHumidity();

  if (isNaN(h) || isNaN(t)) {
    print('Failed to read data from sensor');
    return;
  }
  topic = "/ibero/02/";
  topic=topic+'TE_DHT11_'+JSON.stringify(pind);
  message = JSON.stringify(t);
  let ok = MQTT.pub(topic, message, 2);
  print('Published:', ok ? 'yes' : 'no', 'topic:', topic, 'message:', message);
  topic = "/ibero/02/";
  topic=topic+'HU_DHT11_'+JSON.stringify(pind);
  message = JSON.stringify(h);
  let ok = MQTT.pub(topic, message, 2);
  print('Published:', ok ? 'yes' : 'no', 'topic:', topic, 'message:', message);

  let t2 = dht2.getTemp();
  let h2 = dht2.getHumidity();

  if (isNaN(h2) || isNaN(t2)) {
    print('Failed to read data from sensor');
    return;
  }
  topic = "/ibero/02/";
  topic=topic+'TE_DHT11_'+JSON.stringify(pind2);
  message = JSON.stringify(t2);
  let ok = MQTT.pub(topic, message, 2);
  print('Published:', ok ? 'yes' : 'no', 'topic:', topic, 'message:', message);
  topic = "/ibero/02/";
  topic=topic+'HU_DHT11_'+JSON.stringify(pind2);
  message = JSON.stringify(h2);
  let ok = MQTT.pub(topic, message, 2);
  print('Published:', ok ? 'yes' : 'no', 'topic:', topic, 'message:', message);

}, null);

function constrain(x,a,b) {
  if(x < a) {
        return a;
    }
    else if(b < x) {
        return b;
    }
    else
        return x;
}

function getPctje(medicion,min,max) {
  let x = constrain(medicion,min,max);
  x = (x - min) * (0 - 100) / (max - min) + 100;
  return x;
}