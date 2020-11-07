import * as dialogs from '@nativescript/core/ui/dialogs';
import { Observable } from '@nativescript/core/data/observable';
import { ObservableArray } from '@nativescript/core/data/observable-array';
import { Frame } from '@nativescript/core/ui/frame';
import { Prop } from './utils/obs-prop';
import { Bluetooth, Peripheral, getBluetoothInstance } from '@nativescript-community/ble';

export class NavSelectModel extends Observable {
    @Prop() public isLoading = false;

    public peripherals = new ObservableArray<Peripheral>();
    private _bluetooth = getBluetoothInstance();

    constructor() {
        super();
        // enables the console.logs from the Bluetooth source code
        this._bluetooth.debug = true;

        // using an event listener instead of the 'onDiscovered' callback of 'startScanning'
        this._bluetooth.on(Bluetooth.device_discovered_event, (eventData: any) => {
            const perip = eventData.data as Peripheral;
            let index = -1;
            this.peripherals.some((p, i) => {
                if (p.UUID === perip.UUID) {
                    index = i;
                    return true;
                }
                return false;
            });

            console.log('Peripheral found:', JSON.stringify(eventData.data), index);
            if (index === -1) {
                this.peripherals.push(perip);
            } else {
                this.peripherals.setItem(index, perip);
            }
        });
        this.doStartScanning();
    }

    public doIsBluetoothEnabled() {
        console.log('doIsBluetoothEnabled tap');
        this._bluetooth.isBluetoothEnabled().then(enabled => {
            if (enabled === false) {
                dialogs.alert('Bluetooth is DISABLED.');
            } else {
                dialogs.alert('Bluetooth is ENABLED.');
            }
        });
    }

    public doEnableBluetooth() {
        this._bluetooth.enable().then(enabled => {
            setTimeout(() => {
                dialogs.alert({
                    title: 'Did the user allow enabling Bluetooth by our app?',
                    message: enabled ? 'Yes' : 'No',
                    okButtonText: 'OK, nice!'
                });
            }, 500);
        });
    }

    // this one 'manually' checks for permissions
    public doScanForUARTMonitor() {
        this._bluetooth.hasLocationPermission().then(granted => {
            if (!granted) {
                this._bluetooth.requestLocationPermission().then(
                    // doing it like this for demo / testing purposes.. better usage is demonstrated in 'doStartScanning' below
                    granted2 => {
                        dialogs.alert({
                            title: 'Granted?',
                            message: granted2 ? 'Yep - now invoke that button again' : 'Nope',
                            okButtonText: 'OK!'
                        });
                    }
                );
            } else {
                const UARTservice = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
                //                   6e400001-b5a3-f393-e0a9-e50e24dcca9e
                // const omegaService = '12345678-9012-3456-7890-1234567890ee';

                this.isLoading = true;
                // reset the array
                this.peripherals.splice(0, this.peripherals.length);
                this._bluetooth
                    .startScanning({
                        // beware: the peripheral must advertise ALL these services
                        filters: [{ serviceUUID: UARTservice }],
                        seconds: 4,
                        onDiscovered: peripheral => {
                            this.peripherals.push(peripheral);
                        },
                        skipPermissionCheck: true // we can skip permissions as we use filters:   https://developer.android.com/guide/topics/connectivity/bluetooth-le
                    })
                    .then(
                        p => {
                            this.isLoading = false;
                            console.log('p', p);
                        },
                        err => {
                            this.isLoading = false;
                            dialogs.alert({
                                title: 'Whoops!',
                                message: err,
                                okButtonText: 'OK, got it'
                            });
                        }
                    );
            }
        });
    }

    // this one uses automatic permission handling
    public doStartScanning() {
        this.isLoading = true;
        // reset the array
        this.peripherals.length = 0;
        this._bluetooth
            .startScanning({
                seconds: 2, // passing in seconds makes the plugin stop scanning after <seconds> seconds
                // onDiscovered: peripheral => {
                //     console.log("peripheral discovered. Not adding it here because we're using a listener.");
                //     // this.peripherals.push(peripheral);
                // },
                skipPermissionCheck: false // we can't skip permissions and we need enabled location as we dont use filters: https://developer.android.com/guide/topics/connectivity/bluetooth-le
            })
            .then(() => (this.isLoading = false))
            .catch(err => {
                this.isLoading = false;
                dialogs.alert({
                    title: 'Whoops!',
                    message: err ? err : 'Unknown error',
                    okButtonText: 'OK, got it'
                });
            });
    }

    public doStopScanning() {
        this._bluetooth.stopScanning().then(
            () => {
                this.isLoading = false;
            },
            err => {
                dialogs.alert({
                    title: 'Whoops!',
                    message: err,
                    okButtonText: 'OK, so be it'
                });
            }
        );
    }
}
