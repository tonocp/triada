<template>
  <main
    class="min-h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-b from-black via-neutral-900 to-black text-white px-6 py-10"
  >
    <!-- Top badge -->
    <section class="w-full max-w-md flex flex-col items-center gap-6">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-black/80 border border-red-700/60 px-3 py-1 text-[0.7rem] tracking-[0.18em] uppercase"
      >
        <span
          class="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_rgba(220,38,38,0.9)]"
        />
        <span class="text-neutral-200">Ups, algo salió mal</span>
      </div>

      <!-- 404 + message -->
      <div class="flex flex-col items-center text-center gap-3">
        <p
          class="text-[5rem] leading-none font-black tracking-tight bg-gradient-to-br from-red-500 via-red-600 to-red-800 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(185,28,28,0.6)]"
        >
          404
        </p>
        <h1 class="text-xl font-semibold text-white">Página no encontrada</h1>
        <p class="text-sm text-neutral-200 leading-relaxed">
          Puede que el enlace esté roto o que la página haya sido movida. Vuelve al inicio para
          seguir explorando la app.
        </p>
      </div>

      <!-- Actions -->
      <div class="w-full flex flex-col gap-3 mt-1">
        <RouterLink to="/" class="w-full">
          <Button
            class="w-full justify-center rounded-xl bg-red-600 text-white font-semibold text-sm py-3.5 shadow-[0_12px_35px_rgba(185,28,28,0.55)] hover:bg-red-500 active:bg-red-700 transition-colors"
            aria-label="Volver al inicio"
          >
            Volver al inicio
          </Button>
        </RouterLink>

        <button
          type="button"
          class="mx-auto text-xs text-neutral-400 hover:text-white transition-colors underline underline-offset-4"
          @click="$router.back()"
        >
          O volver a la pantalla anterior
        </button>
      </div>

      <!-- Tiny footer note -->
      <p class="mt-4 text-[11px] text-neutral-500 text-center">
        Código de error:&nbsp;
        <span class="font-mono tracking-tight text-neutral-200"> HTTP 404 </span>
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Button } from '@/modules/shared/components/ui/button';
</script>

<style scoped></style>
