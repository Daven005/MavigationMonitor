import { EventData, Page } from '@nativescript/core';
import { NavMonitorModel } from './main-view-model';
import { Frame } from '@nativescript/core/ui/frame';

export var navModel: NavMonitorModel;

export function navigatingto(args: EventData) {
    // activity = application.startActivity;
    const page = <Page>args.object;
    if (navModel) {
        page.bindingContext = navModel
    } else {
        page.bindingContext = navModel = new NavMonitorModel(page);
    }
}

export function loaded(args: EventData) {
    navModel.setupGauge();
}

export function onSelect(args) {
    var navigationEntry = {
        moduleName: "select-page",
        transition: {
            name: "fade",
            duration: 200,
        },
        context: navModel
    };
    Frame.topmost().navigate(navigationEntry);
}