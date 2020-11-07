import { Observable, Page } from '@nativescript/core';
import { ObservableArray } from '@nativescript/core/data/observable-array';
import { Bluetooth, getBluetoothInstance, Service, ReadResult } from '@nativescript-community/ble';
import type { AdvertismentData, Peripheral } from '@nativescript-community/ble';
import * as dialogs from '@nativescript/core/ui/dialogs';
import { Prop } from './utils/obs-prop'
import { navModel } from './main-page'
import { RadRadialGauge, RadialScale, RadialNeedle } from "nativescript-ui-gauge";
import { Frame } from '@nativescript/core/ui/frame';

interface Latitude {
    degrees: number;
    minutes: number;
    seconds: number;
    south: boolean;
    str: string;
}
interface Longitude {
    degrees: number;
    minutes: number;
    seconds: number;
    east: boolean;
    str: string;
}
interface Wind {
    true: {
        angle: number;
        speed: number;
    }
    apparent: {
        angle: number;
        speed: number;
        str: string;
        side: string;
    }
}
interface Depth {
    metres: number;
    alarmFlags: number;
}
interface Compass {
    angle: number; // Magnetic
    variation: number;
}
interface Course {
    angle: number; // Magnetic
    destination: number;
}
interface Speed {
    water: number;
    ground: number;
}
interface SeaTalk {
    msg: number[];
}
export class NavMonitorModel extends Observable {
    latitude: Latitude
    longitude: Longitude
    wind: Wind = { apparent: { speed: 0, angle: 0, str: '0', side: 'Stbd' }, true: { speed: 0, angle: 0 } }
    depth: Depth = { metres: 0, alarmFlags: 0 }
    course: Course = { angle: 0, destination: 0 }
    compass: Compass = { angle: 0, variation: 0 }
    speed: Speed = { water: 0, ground: 0 }
    @Prop() private connected: boolean = false;
    @Prop() private msg: string;
    @Prop() private cmd: string;
    @Prop() public windStr: string;
    @Prop() public latitudeStr: string;
    @Prop() public longitudeStr: string;
    @Prop() public windApparentStr: string;
    @Prop() public compassAngleStr: string;
    @Prop() public courseAngleStr: string;
    @Prop() public courseDestinationStr: string;
    @Prop() public compassVariationStr: string;
    @Prop() public speedWaterStr: string;
    @Prop() public speedGroundStr: string
    @Prop() public autopilotMode: string;
    @Prop() public showCompass: boolean = false;

    public service: Service = null;
    public peripheral: Peripheral;
    public advertismentData: AdvertismentData;
    private _bluetooth = getBluetoothInstance();

    private windneedle: RadialNeedle
    private compassScale: RadialScale
    private waypointNeedle: RadialNeedle
    private windneedle_l: RadialNeedle
    private compassScale_l: RadialScale
    private waypointNeedle_l: RadialNeedle

    private PERIPH_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
    private TX_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'
    private RX_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'

    constructor(page: Page) {
        super();
        this.storeLatitude(0, 0, false);
        this.storeLongitude(0, 0, false)
        this.storeApparentWindSpeed(0, 0)
        // this.storeApparentWindAngle(0)
        this.storeDepth(0, 0, 0);
        // this.storeCourse(0);
        this.storeVariation(0);
        this._bluetooth.debug = false;
    }

    public setupGauge() {
        let windGauge: RadRadialGauge = <RadRadialGauge>Frame.topmost().getViewById("windGaugeView");
        let windScale: RadialScale = <RadialScale>windGauge.scales.getItem(0);
        this.windneedle = <RadialNeedle>windScale.indicators.getItem(windScale.indicators.length - 1);
        let compassGauge: RadRadialGauge = <RadRadialGauge>Frame.topmost().getViewById("compassGaugeView");
        this.compassScale = <RadialScale>compassGauge.scales.getItem(0);
        this.waypointNeedle = <RadialNeedle>this.compassScale.indicators.getItem(this.compassScale.indicators.length - 1);
        
        let windGauge_l: RadRadialGauge = <RadRadialGauge>Frame.topmost().getViewById("compassGaugeViewLarge");
        let windScale_l: RadialScale = <RadialScale>windGauge_l.scales.getItem(0);
        this.windneedle_l = <RadialNeedle>windScale_l.indicators.getItem(windScale_l.indicators.length - 1);
        let compassGauge_l: RadRadialGauge = <RadRadialGauge>Frame.topmost().getViewById("compassGaugeViewLarge");
        this.compassScale_l = <RadialScale>compassGauge_l.scales.getItem(0);
        this.waypointNeedle_l = <RadialNeedle>this.compassScale_l.indicators.getItem(this.compassScale_l.indicators.length - 1);
    }
    public onToggleComapass() {
        // this.cmd=`toggle: ${this.showCompass}`
        this.showCompass = !this.showCompass;
    }
    private storeDepth(units, flags, depth) {
        this.depth.metres = depth / 20 * 0.305
        this.depth.alarmFlags = flags
    }
    private storeApparentWindAngle(degrees_2) {
        let angle = degrees_2 / 2 + (degrees_2 % 2) * 0.5
        this.wind.apparent.angle = angle
        console.log(this.windneedle)
        this.windneedle.value = angle
        if (angle > 180) {
            this.wind.apparent.str = `${360 - angle}\xB0 Port`
        } else {
            this.wind.apparent.str = `${angle}\xB0 Stbd`
        }
        this.windApparentStr = this.wind.apparent.str
    }
    private storeApparentWindSpeed(knots, decimal) {
        this.wind.apparent.speed = knots + decimal / 10
    }
    private storeLatitude(degrees, minutes, south) {
        let m_100 = Math.floor(minutes / 100);
        let l: Latitude = {
            degrees: degrees,
            minutes: m_100,
            seconds: (minutes - m_100 * 100) * 60 / 100,
            south: south,
            str: ''
        }
        l.str = `Lat ${l.degrees}\xB0 ${l.minutes}' ${l.seconds}" ${l.south ? 'S' : 'N'}`
        this.latitude = l;
        this.latitudeStr = this.latitude.str;
    }
    private storeLongitude(degrees, minutes, east) {
        let m_100 = Math.floor(minutes / 100);
        let l: Longitude = {
            degrees: degrees,
            minutes: m_100,
            seconds: (minutes - m_100 * 100) * 60 / 100,
            east: east,
            str: ''
        }
        l.str = `Long ${l.degrees}\xB0 ${l.minutes}' ${l.seconds}" ${l.east ? 'E' : 'W'}`
        this.longitude = l;
        this.longitudeStr = this.longitude.str;
    }
    private storeCourse(angle) {
        this.course.angle = angle;
        this.courseAngleStr = `${this.course.angle}\xB0`
    }
    private storeDestination(destination) {
        this.course.destination = destination
        this.courseDestinationStr = `\u21D1 ${this.course.destination}\xB0`
        this.waypointNeedle.value = destination - this.compassScale.startAngle
        this.waypointNeedle_l.value = destination - this.compassScale.startAngle
        this.cmd += `storeDestination-${this.waypointNeedle.value}`
    }
    private storeVariation(angle) {
        angle = -this.uncomplement(angle, 8)
        this.compass.variation = angle;
        this.compassVariationStr = `Var: ${this.compass.variation}\xB0`
    }
    private storeCompass(angle) {
        this.compass.angle = angle
        this.compassAngleStr = `${this.compass.angle}\xB0`
        this.compassScale.startAngle = -angle - 90
        this.compassScale_l.startAngle = -angle - 90
        this.cmd = `storeCompass-${this.compassScale_l.startAngle}`
    }
    private storeWaterSpeed(knots) {
        this.speed.water = knots
        this.speedWaterStr = `Water: ${this.speed.water} knots`
    }
    private storeGroundSpeed(knots) {
        this.speed.ground = knots
        this.speedGroundStr = `Ground: ${this.speed.ground} knots`
    }
    private storeAutoPilotMode(mode) {
        if ((mode & 0x2) == 0) this.autopilotMode = 'Standby'
        else if ((mode & 0x2) == 2) this.autopilotMode = 'Auto'
        else if ((mode & 0x4) == 4) this.autopilotMode = 'Vane'
    }
    private storeTime(hours, seconds) {
    }
    private storeDate(day, month, year) {
    }
    private uncomplement(val, bitwidth) {
        var isnegative = val & (1 << (bitwidth - 1));
        var boundary = (1 << bitwidth);
        var minval = -boundary;
        var mask = boundary - 1;
        return isnegative ? minval + (val & mask) : val;
    }
    private decodeBLEmessage(s: string) {
        navModel.set('msg', s);
        s = s.replace('%', '');
        let msg: number[] = s.split(' ').map((item) => parseInt(item, 16)).filter(n => !isNaN(n));
        console.log(msg);
        switch (msg[0]) {
            case 0x100: // depth
                this.storeDepth(msg[2] >> 4, msg[2] & 0xf, (msg[4] << 8) | msg[3]);
                break;
            case 0x110: // Apparent Wind Angle
                this.storeApparentWindAngle((msg[2] << 8) | msg[3]);
                break;
            case 0x111: // Apparent Wind speed
                this.storeApparentWindSpeed(msg[2] & 0x7f, msg[3]);
                break;
            case 0x120: // Speed through Water
                this.storeWaterSpeed(((msg[3] << 8) | msg[2]) / 10);
                break;
            case 0x150: // Latitude
                this.storeLatitude(msg[2], ((msg[4] << 8) | msg[3]) & 0x7fff, msg[4] >> 7);
                break;
            case 0x151: // Longitude
                this.storeLongitude(msg[2], ((msg[4] << 8) | msg[3]) & 0x7fff, msg[4] >> 7);
                break;
            case 0x152: // Speed over Ground
                this.storeGroundSpeed(msg[2] | (msg[3] << 8));
                break;
            case 0x153: // Course Magnetic
                this.storeCourse((msg[1] << 4 | msg[2]) / 8);
                break;
            case 0x154: // Time
                this.storeTime(msg[2] << 4 | (msg[1] & 0xf), msg[3]);
                break;
            case 0x156: // Date
                this.storeDate(msg[2], msg[1] >> 4, msg[3]);
                break;
            case 0x184:
                this.storeCompass(((msg[1] & 0x3) & 0x3) * 90 + (msg[2] & 0x3F) * 2 + ((msg[1]) & 0xC) / 8)
                this.storeDestination((msg[2] >> 6) * 90 + msg[3] / 2)
                this.storeAutoPilotMode(msg[4]);
                break;
            case 0x199: // Variation
                this.storeVariation(msg[2]);
                break;
            case 0x19c: // Compass heading
                this.storeCompass(((msg[1] >> 4) & 0x3) * 90 + (msg[2] & 0x3F) * 2 + ((msg[1] >> 4) & 0xC) / 8);
                break;
        }
    }

    public onClose() {
        console.log("onClose")
        if (this.connected && this.peripheral) {
            this._bluetooth.disconnect({ UUID: this.peripheral.UUID })
                .then(() => console.log("Disconnected"),
                    (err) => console.error(err));
        } else {
            this.msg = 'Not connected'
        }
    }

    public onSendCmd() {
        let cmds: string[] =    ['set -n Tx', 'set -n Rx', 'set -s On', 'set -s Off']
        let actions: string[] = ["Tx NMEA", "Rx MNEA", "ST->BLE On", "ST->BLE Off",]
        dialogs.action({ message: "Choose command", cancelButtonText: "Cancel", actions: actions })
        .then(result => {
            let idx = actions.findIndex(s => s == result)
            if (idx >= 0) 
                this.send(`>${cmds[idx]}`, result)
            else
                this.cmd = `??? ${result}`
        });
    }

    public connect(periph: Peripheral) {
        return new Promise((resolve, reject) => {
            if (this.connected) reject("Already connected");
            this.peripheral = periph;
            this.advertismentData = periph.advertismentData as AdvertismentData;
            console.log('connecting to peripheral', this.peripheral);
            this._bluetooth
                .connect({
                    UUID: this.peripheral.UUID,
                    onConnected: peripheral => {
                        this.connected = true;
                        console.log('------- Peripheral connected: ');
                        peripheral.services.forEach(value => {
                            console.log('---- ###### adding service: ' + value.UUID);
                            if (value.UUID == this.PERIPH_UUID) {
                                this.service = value;
                            }
                        });
                        if (this.service) {
                            this._bluetooth.startNotifying({
                                peripheralUUID: this.peripheral.UUID,
                                serviceUUID: this.service.UUID,
                                characteristicUUID: this.RX_UUID,
                                onNotify: result => {
                                    const array = new Uint8Array(result.value);
                                    const strVal = String.fromCharCode.apply(null, array);
                                    switch (strVal.charAt(0)) {
                                        case '%':
                                            this.decodeBLEmessage(strVal);
                                            break;
                                        case '$':
                                            this.cmd = `NMEA: ${strVal}`
                                            break;
                                    }
                                }
                            })
                                .then((result: ReadResult) => {
                                    console.log("Notifying started")
                                })
                        } else {
                            reject("UART not found")
                        }
                        resolve();
                    },
                    onDisconnected: peripheral => {
                        this.connected = false;
                        dialogs.alert({
                            title: 'Disconnected',
                            message: 'Disconnected from peripheral: ' + JSON.stringify(peripheral),
                            okButtonText: 'Okay'
                        });
                    }
                })
                .catch(err => {
                    this.connected = false;
                    console.log('error connecting to peripheral', err);
                    reject(err);
                });
        });
    }

    public onTackPort(args) {
        let options = {
            title: "Tack to Port ??",
            okButtonText: "Yes",
            neutralButtonText: "Cancel"
        };
        dialogs.confirm(options).then((result: boolean) => {
            if (result) this.send(`%186 11 21 de`, 'Tack to Port')
        });
    }
    public onTackStbd(args) {
        let options = {
            title: `Tack to Starboard ??`,
            okButtonText: "Yes",
            neutralButtonText: "Cancel"
        };
        dialogs.confirm(options).then((result: boolean) => {
            if (result) this.send(`%186 11 28 d7`, 'Tack to Stbd')
        });

    }
    public onPort_10() {
        this.send('%186 11 06 F9', 'Port 10')
    }
    public onPort_1() {
        this.send('%186 11 05 FA', 'Port 1')
    }
    public onStbd_1() {
        this.send('%186 11 07 f8', 'Stbd 1')
    }
    public onStbd_10() {
        this.send('%186 11 08 f7', 'Stbd 10')
    }
    send(data: string, msg: string) {
        if (this.connected && this.peripheral) {
            this.cmd = `Rq: ${msg}`
            this._bluetooth.write({
                peripheralUUID: this.peripheral.UUID,
                serviceUUID: this.service.UUID,
                characteristicUUID: this.TX_UUID,
                value: data
            })
                .then(function (result) {
                    this.cmd = msg
                    console.log(msg);
                }, function (err) {
                    console.log("write error: ", err);
                });
        } else this.msg = "Not Connected"
    }
}
