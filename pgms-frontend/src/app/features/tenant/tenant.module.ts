import { NgModule } from '@angular/core';

import { LayoutsModule } from '../../layouts/layouts.module';
import { SharedModule } from '../../shared/shared.module';
import { TenantSectionComponent } from './components/tenant-section.component';
import { TenantRoutingModule } from './tenant-routing.module';

@NgModule({
  declarations: [TenantSectionComponent],
  imports: [
    SharedModule,
    LayoutsModule,
    TenantRoutingModule
  ]
})
export class TenantModule { }
