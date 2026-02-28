<script setup lang="ts">
import UserHeader from '@/modules/shared/components/molecules/UserHeader.vue';
import TopNavBar from '@/modules/shared/components/organisms/TopNavBar.vue';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from '@/modules/shared/components/ui/sidebar';
import { Icon } from '@iconify/vue';
</script>

<template>
  <SidebarProvider>
    <Sidebar>
      <SidebarHeader style="padding-top: env(safe-area-inset-top)">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div
                class="flex w-10 h-6 aspect-square items-center justify-center rounded-lg text-sidebar-primary-foreground"
              >
                <img src="/next_logo.png" alt="Logo" class="w-full h-full" />
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">NEXT DIGITAL</span>
                <span class="truncate text-xs">Enterprise</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton as-child>
                  <a href="/bottom-layout/home">
                    <Icon icon="material-symbols-light:home" />
                    <span>View bottom-layout</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuButton class="py-12">
          <UserHeader name="Sergi" email="sergi.rivero@nextdigital.es" initials="SR" />
        </SidebarMenuButton>
      </SidebarFooter>
      <SidebarRail class="pt-[env(safe-area-inset-top)]"> </SidebarRail>
    </Sidebar>
    <SidebarInset class="relative">
      <TopNavBar />
      <SidebarContent
        class="flex-1 overflow-auto"
        style="padding-top: calc(env(safe-area-inset-top) + 4rem)"
      >
        <div>
          <RouterView />
        </div>
      </SidebarContent>
    </SidebarInset>
  </SidebarProvider>
</template>
