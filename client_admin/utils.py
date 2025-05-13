import pytz
from django.utils import timezone
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, NumberObject, TextStringObject
from io import BytesIO

def display_user_time(user, utc_datetime):
    user_tz = pytz.timezone(user.profile.timezone)
    return timezone.localtime(utc_datetime, user_tz)

def fill_certificate_form(template_stream, data):
    """
    Fills form fields in a PDF template loaded from a BytesIO stream.

    :param template_stream: BytesIO of the PDF with AcroForm fields.
    :param data: Dict of field_name -> value.
    :return: BytesIO containing the filled PDF.
    """
    reader = PdfReader(template_stream)
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)

    if "/AcroForm" in reader.trailer["/Root"]:
        print("AcroForm found. Attempting to fill fields...")

        fields = reader.get_fields()
        if fields:
            print("Fields found in the PDF:")
            for name in fields.keys():
                print(f" - {name}")
        else:
            print("No fillable fields found in the AcroForm.")

        # Copy the full AcroForm to the output PDF
        acro_form = reader.trailer["/Root"]["/AcroForm"]
        writer._root_object.update({
            NameObject("/AcroForm"): acro_form
        })

        # Apply data to fields
        writer.update_page_form_field_values(writer.pages[0], data)

        for page in writer.pages:
            page_obj = page.get_object()
            if "/Annots" in page_obj:
                for annot in page_obj["/Annots"]:
                    field = annot.get_object()

                    # Detect field name
                    field_name = field.get("/T")
                    if field_name == "CertificateId":
                        # Add margin via leading space or smaller font size
                        field.update({
                            NameObject("/Ff"): NumberObject(1),
                            NameObject("/DA"): TextStringObject("/Helv 11 Tf 0 g")  # You can also try "/Helv 10 Tf 0 g"
                        })
                        # Optionally pad the actual field value itself:
                        if "CertificateId" in data:
                            data["CertificateId"] = "   " + data["CertificateId"]  # Add 3 spaces
                    else:
                        # Normal appearance for other fields
                        field.update({
                            NameObject("/Ff"): NumberObject(1),
                            NameObject("/DA"): TextStringObject("/Helv 12 Tf 0 g")
                        })

    else:
        print("No AcroForm dictionary found in the PDF.")

    # Final output
    output = BytesIO()
    writer.write(output)
    output.seek(0)
    return output

def get_strftime_format(custom_format):
    mapping = {
        "MM/DD/YYYY": "%m/%d/%Y",
        "DD/MM/YYYY": "%d/%m/%Y",
        "YYYY-MM-DD": "%Y-%m-%d"
    }
    return mapping.get(custom_format, "%m/%d/%Y")

def get_flatpickr_format(custom_format):
    mapping = {
        "MM/DD/YYYY": "m/d/Y",
        "DD/MM/YYYY": "d/m/Y",
        "YYYY-MM-DD": "Y-m-d"
    }
    return mapping.get(custom_format, "%m/%d/%Y")