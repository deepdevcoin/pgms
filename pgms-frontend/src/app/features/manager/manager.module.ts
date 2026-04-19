import { NgModule } from '@angular/core';

import { LayoutsModule } from '../../layouts/layouts.module';
import { SharedModule } from '../../shared/shared.module';
import { ManagerSectionComponent } from './components/manager-section.component';
import { ManagerRoutingModule } from './manager-routing.module';

@NgModule({
  declarations: [ManagerSectionComponent],
  imports: [
    SharedModule,
    LayoutsModule,
    ManagerRoutingModule
  ]
})
export class ManagerModule { }
