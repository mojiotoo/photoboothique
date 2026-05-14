<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Blade;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Let Blade also compile files that end in .html
        // (so resources/views/gallery.html can use {{ }} and @forelse)
        $this->app['view']->addExtension('html', 'blade');
    }
}