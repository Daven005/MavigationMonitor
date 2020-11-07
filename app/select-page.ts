import { NavSelectModel } from './select-view-model';
import { Frame } from '@nativescript/core/ui/frame';
import { navModel } from './main-page';

export function pageLoaded(args) {
    const page = args.object;
    page.bindingContext = new NavSelectModel;
    console.log(page.bindingContext)
}

export function onPeripheralTap(args) {
    const peri = args.object.bindingContext;
    console.log('--- peripheral selected: ' + peri.UUID);

    navModel.connect(peri)
    .then(() => {

    })
    .catch((err) => {
        console.error(err);
    });

    const navigationEntry = {
        moduleName: 'main-page',
        context: {
            peripheral: peri
        },
        animated: true
    };
    Frame.topmost().navigate(navigationEntry);
}

export function onDone(args) {
    var navigationEntry = {
        moduleName: "main-page",
        transition: {
            name: "fade",
            duration: 200,
        }
    };
    Frame.topmost().navigate(navigationEntry);
}
