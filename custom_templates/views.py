from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count
from django.http import JsonResponse, HttpResponseNotFound
import json
from .models import Dashboard, Widget, Header, Footer
from .forms import DashboardForm

def templates(request):
    header = Header.objects.first()
    footer = Footer.objects.first()

    return render(request, 'html/templates.html', {'header': header, 'footer': footer})

def set_main_dashboard(request, dashboard_id):
    if request.method == 'POST':
        is_main = request.POST.get('is_main') == 'true'
        
        if is_main:
            # The dashboard is currently the main one, so we un-set it
            dashboard = get_object_or_404(Dashboard, id=dashboard_id)
            dashboard.is_main = False
            dashboard.save()
        else:
            # Reset any existing main dashboard
            Dashboard.objects.update(is_main=False)
            # Set the selected dashboard as the main dashboard
            dashboard = get_object_or_404(Dashboard, id=dashboard_id)
            dashboard.is_main = True
            dashboard.save()

        # Redirect to the referring page or default to home if referer is not present
        referer_url = request.META.get('HTTP_REFERER', '/')
        return JsonResponse({'success': True, 'redirect_url': referer_url})

    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)

def dashboard_list(request):
    dashboards = Dashboard.objects.annotate(num_widgets=Count('widgets')).order_by('-is_main', 'name')
    return render(request, 'html/dashboard_list.html', {'dashboards': dashboards})

def dashboard_create(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            form = DashboardForm({
                'name': data['name'],
                'layout': data['layout']
            })
            if form.is_valid():
                dashboard = form.save()
                
                # Create Default Template
                if data['layout'] == 'layout2':
                    Widget.objects.create(dashboard=dashboard, type='resumeCourses', widget_title='Course Name', widget_title_color='#000000', widget_subtext='Resume', widget_subtext_color='#6b6b6b', widget_icon='fa-solid fa-play', widget_icon_color='#8a2be2', widget_icon_background_color='#e5caff', widget_external_link=None)
                    Widget.objects.create(dashboard=dashboard, type='myCourses', widget_title='My Courses', widget_title_color='#000000', widget_subtext='See courses you are enrolled in', widget_subtext_color='#6b6b6b', widget_icon='fa-solid fa-book-open-cover', widget_icon_color='#dc6618', widget_icon_background_color='#ffbf7c', widget_external_link=None)
                    Widget.objects.create(dashboard=dashboard, type='enrollmentKey', widget_title='Enrollment Key', widget_title_color='#000000', widget_subtext='Have an Enrollment Key?', widget_subtext_color='#6b6b6b', widget_icon='fa-solid fa-key', widget_icon_color='#e03a59', widget_icon_background_color='#ffc9d2', widget_external_link=None)
                    Widget.objects.create(dashboard=dashboard, type='externalLink', widget_title='External Link', widget_title_color='#000000', widget_subtext='Link to an external source', widget_subtext_color='#6b6b6b', widget_icon='fa-solid fa-link', widget_icon_color='#1863dc', widget_icon_background_color='#d0e0ff', widget_external_link=None)
                    
                return JsonResponse({'success': True, 'dashboard_id': dashboard.id})
            else:
                return JsonResponse({'success': False, 'error': form.errors}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    else:
        return render(request, 'html/dashboard_create.html')

def dashboard_edit(request, dashboard_id):
    dashboard = get_object_or_404(Dashboard, id=dashboard_id)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            print(f"Received data: {data}")  # Debugging line
            form = DashboardForm(data, instance=dashboard)
            if form.is_valid():
                form.save()
                return JsonResponse({'success': True, 'message': 'Dashboard updated successfully!'})
            else:
                print(f"Form errors: {form.errors}")  # Debugging line
                return JsonResponse({'success': False, 'errors': form.errors}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            print(f"Exception: {str(e)}")  # Debugging line
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    else:
        form = DashboardForm(instance=dashboard)
        return render(request, 'html/dashboard_edit.html', {'form': form, 'dashboard': dashboard, 'selected_layout': dashboard.layout})


def widget_add(request, dashboard_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            type = data.get('type')
            widget_title = data.get('widget_title')
            widget_title_color = data.get('widget_title_color')
            widget_subtext = data.get('widget_subtext')
            widget_subtext_color = data.get('widget_subtext_color')
            widget_icon = data.get('widget_icon')
            widget_icon_color = data.get('widget_icon_color')
            widget_icon_background_color = data.get('widget_icon_background_color')
            widget_external_link = data.get('widget_external_link')

            dashboard = Dashboard.objects.get(id=dashboard_id)
            widget = Widget.objects.create(dashboard=dashboard, type=type, widget_title=widget_title, widget_title_color=widget_title_color, widget_subtext=widget_subtext, widget_subtext_color=widget_subtext_color, widget_icon=widget_icon, widget_icon_color=widget_icon_color, widget_icon_background_color=widget_icon_background_color, widget_external_link=widget_external_link)

            return JsonResponse({'success': True, 'widget_id': widget.id})
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        except Dashboard.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Dashboard not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    else:
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
def delete_widget(request, widget_id):
    if request.method == 'DELETE':
        try:
            widget = Widget.objects.get(id=widget_id)
            widget.delete()
            return JsonResponse({'success': True})
        except Widget.DoesNotExist:
            return HttpResponseNotFound("Widget not found")
    return HttpResponseNotFound("Invalid request method")
    
def get_widget_data(request, widget_id):
    widget = get_object_or_404(Widget, id=widget_id)
    return JsonResponse({
        'widget_title': widget.widget_title,
        'widget_title_color': widget.widget_title_color,
        'widget_subtext': widget.widget_subtext,
        'widget_subtext_color': widget.widget_subtext_color,
        'widget_icon': widget.widget_icon,
        'widget_icon_color': widget.widget_icon_color,
        'widget_icon_background_color': widget.widget_icon_background_color,
        'widget_external_link': widget.widget_external_link,
        'type': widget.type,
    })

def edit_widget(request, widget_id):
    if request.method == 'POST':
        try:
            widget = Widget.objects.get(id=widget_id)
            data = json.loads(request.body)
            widget.type = data.get('type', widget.type)
            widget.widget_title = data.get('widget_title', widget.widget_title)
            widget.widget_title_color = data.get('widget_title_color', widget.widget_title_color)
            widget.widget_subtext = data.get('widget_subtext', widget.widget_subtext)
            widget.widget_subtext_color = data.get('widget_subtext_color', widget.widget_subtext_color)
            widget.widget_icon = data.get('widget_icon', widget.widget_icon)
            widget.widget_icon_color = data.get('widget_icon_color', widget.widget_icon_color)
            widget.widget_icon_background_color = data.get('widget_icon_background_color', widget.widget_icon_background_color)
            widget.widget_external_link = data.get('widget_external_link', widget.widget_external_link)
            widget.save()
            return JsonResponse({'success': True})
        except Widget.DoesNotExist:
            return HttpResponseNotFound("Widget not found")
    return HttpResponseNotFound("Invalid request method")

def edit_dashboard_header(request, dashboard_id):
    if request.method == 'POST':
        try:
            dashboard = Dashboard.objects.get(id=dashboard_id)
            data = json.loads(request.body)
            
            # Update the dashboard header fields with the provided data
            dashboard.header_background_image = data.get('header_background_image', dashboard.header_background_image)
            dashboard.header_background_image_position = data.get('header_background_image_position', dashboard.header_background_image_position)
            dashboard.header_title = data.get('header_title', dashboard.header_title)
            dashboard.header_subtext = data.get('header_subtext', dashboard.header_subtext)
            dashboard.header_icon = data.get('header_icon', dashboard.header_icon)
            dashboard.header_icon_color = data.get('header_icon_color', dashboard.header_icon_color)
            dashboard.header_icon_background_color = data.get('header_icon_background_color', dashboard.header_icon_background_color)
            dashboard.header_text_color = data.get('header_text_color', dashboard.header_text_color)
            dashboard.header_subtext_color = data.get('header_subtext_color', dashboard.header_subtext_color)
            
            dashboard.save()
            return JsonResponse({'success': True})
        except Dashboard.DoesNotExist:
            return HttpResponseNotFound("Dashboard not found")
    return HttpResponseNotFound("Invalid request method")

@require_POST
def widget_reorder(request):
    try:
        data = json.loads(request.body)
        widget_ids = data.get('widget_ids', [])
        print(widget_ids)
        
        # Check if all widget IDs are valid (i.e., not None and are digits)
        if not all(isinstance(widget_id, str) and widget_id.isdigit() for widget_id in widget_ids):
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
    header = Header.objects.first()
    footer = Footer.objects.first()
    # Pass necessary context to the template
    context = {
        'dashboard': dashboard,
        'header': header,
        'footer': footer,
    }
    
    return render(request, 'html/dashboard_preview.html', context)

def dashboard_delete(request, dashboard_id):
    try:
        dashboard = Dashboard.objects.get(pk=dashboard_id)
        dashboard.delete()
        return JsonResponse({'success': True})
    except Dashboard.DoesNotExist:
        raise Http404("Dashboard does not exist")
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
def update_header(request):
    if request.method == 'POST':
        header = Header.objects.first()  # Get the first and only Header instance

        header.header_logo_display = request.POST.get('header_logo_display', header.header_logo_display)
        header.header_logo = request.POST.get('header_logo', header.header_logo)
        header.header_background_color = request.POST.get('header_background_color', header.header_background_color)
        header.header_text_color = request.POST.get('header_text_color', header.header_text_color)
        header.header_text_hover_color = request.POST.get('header_text_hover_color', header.header_text_hover_color)
        header.header_text_background_color = request.POST.get('header_text_background_color', header.header_text_background_color)
        
        header.save()
        
        return JsonResponse({'success': True, 'message': 'Header updated successfully'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)

def update_footer(request):
    if request.method == 'POST':
        footer = Footer.objects.first()  # Get the first and only Header instance

        footer.footer_background_color = request.POST.get('footer_background_color', footer.footer_background_color)
        footer.footer_text_color = request.POST.get('footer_text_color', footer.footer_text_color)
        
        footer.save()
        
        return JsonResponse({'success': True, 'message': 'Footer updated successfully'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)