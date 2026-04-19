import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { SharedModule } from '../shared/shared.module';
import { ManagerLayoutComponent } from './manager-layout/manager-layout.component';
import { OwnerLayoutComponent } from './owner-layout/owner-layout.component';
import { TenantLayoutComponent } from './tenant-layout/tenant-layout.component';

@NgModule({
  declarations: [
    OwnerLayoutComponent,
    ManagerLayoutComponent,
    TenantLayoutComponent
  ],
  imports: [
    SharedModule,
    RouterModule
  ],
  exports: [
    OwnerLayoutComponent,
    ManagerLayoutComponent,
    TenantLayoutComponent
  ]
})
export class LayoutsModule { }
