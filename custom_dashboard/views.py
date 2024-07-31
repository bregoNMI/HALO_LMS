from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from .models import Dashboard, Widget
from .forms import DashboardForm, WidgetForm

def set_main_dashboard(request, dashboard_id):
    if request.method == 'POST':
        Dashboard.objects.update(is_main=False)  # Reset any existing main dashboard
        dashboard = get_object_or_404(Dashboard, id=dashboard_id)
        dashboard.is_main = True
        dashboard.save()
        
        # Redirect to the referring page or default to home if referer is not present
        referer_url = request.META.get('HTTP_REFERER', '/')
        return JsonResponse({'success': True, 'redirect_url': referer_url})

    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)

def main_dashboard(request):
    dashboard = Dashboard.objects.filter(is_main=True).first()
    if dashboard:
        # Render the main dashboard template with the dashboard data
        return render(request, 'userDashboard/main_dashboard.html', {'dashboard': dashboard})
    return render(request, 'no_dashboard.html')  # Template for no main dashboard

def dashboard_list(request):
    dashboards = Dashboard.objects.all()
    return render(request, 'html/dashboard_list.html', {'dashboards': dashboards})

def dashboard_create(request):
    if request.method == 'POST':
        form = DashboardForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('dashboard_list')  # Redirect to the dashboard list page after saving
    else:
        form = DashboardForm()
    
    return render(request, 'html/dashboard_create.html', {'form': form})

def dashboard_edit(request, dashboard_id):
    dashboard = get_object_or_404(Dashboard, id=dashboard_id)
    
    if request.method == 'POST':
        form = DashboardForm(request.POST, instance=dashboard)
        if form.is_valid():
            form.save()
            return redirect('dashboard_list')  # Redirect to dashboard list or any other relevant page
    else:
        form = DashboardForm(instance=dashboard)
    return render(request, 'html/dashboard_edit.html', {'form': form, 'dashboard': dashboard})

@csrf_exempt
def widget_add(request, dashboard_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            title = data.get('title')
            content = data.get('content')

            if not title:
                return JsonResponse({'success': False, 'error': 'Title is required'}, status=400)
            if not content:
                return JsonResponse({'success': False, 'error': 'Content is required'}, status=400)

            dashboard = Dashboard.objects.get(id=dashboard_id)
            widget = Widget.objects.create(dashboard=dashboard, title=title, content=content)

            return JsonResponse({'success': True, 'widget_id': widget.id})
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        except Dashboard.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Dashboard not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    else:
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)

@csrf_exempt
def widget_update(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            widget_id = data.get('widget_id')
            title = data.get('title')
            content = data.get('content')

            if not widget_id:
                return JsonResponse({'success': False, 'error': 'Widget ID is required'}, status=400)
            if not title:
                return JsonResponse({'success': False, 'error': 'Title is required'}, status=400)
            if not content:
                return JsonResponse({'success': False, 'error': 'Content is required'}, status=400)

            widget = Widget.objects.get(id=widget_id)
            widget.title = title
            widget.content = content
            widget.save()

            return JsonResponse({'success': True})
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        except Widget.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Widget not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    else:
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)

@csrf_exempt
@require_POST
def widget_reorder(request):
    try:
        data = json.loads(request.body)
        widget_ids = data.get('widget_ids', [])
        
        if not all(widget_id.isdigit() for widget_id in widget_ids):
            return JsonResponse({'success': False, 'error': 'Invalid widget IDs'}, status=400)
        
        # Reset the order
        for index, widget_id in enumerate(widget_ids):
            widget = get_object_or_404(Widget, id=int(widget_id))
            widget.order = index
            widget.save()
        
        return JsonResponse({'success': True})
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def dashboard_preview(request, dashboard_id):
    # Get the dashboard and any related data
    dashboard = get_object_or_404(Dashboard, id=dashboard_id)
    
    # Pass necessary context to the template
    context = {
        'dashboard': dashboard,
        # Add any other context data if necessary
    }
    
    return render(request, 'html/dashboard_preview.html', context)