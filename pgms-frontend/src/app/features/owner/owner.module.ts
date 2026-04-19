import { NgModule } from '@angular/core';

import { LayoutsModule } from '../../layouts/layouts.module';
import { SharedModule } from '../../shared/shared.module';
import { OwnerSectionComponent } from './components/owner-section.component';
import { OwnerRoutingModule } from './owner-routing.module';

@NgModule({
  declarations: [OwnerSectionComponent],
  imports: [
    SharedModule,
    LayoutsModule,
    OwnerRoutingModule
  ]
})
export class OwnerModule { }
