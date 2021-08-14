﻿﻿import { Popover } from "bootstrap";

export class MdsPersianDateTimePicker {
  constructor(element: Element, setting: MdsPersianDateTimePickerSetting) {
    setting = this.extend(new MdsPersianDateTimePickerSetting(), setting);
    if (!element) throw new Error(`MdsPersianDateTimePicker => element is null!`);
    if (setting.rangeSelector && (setting.toDate || setting.fromDate)) throw new Error(`MdsPersianDateTimePicker => You can not set true 'toDate' or 'fromDate' and 'rangeSelector' together`);
    if (setting.toDate && setting.fromDate) throw new Error(`MdsPersianDateTimePicker => You can not set true 'toDate' and 'fromDate' together`);
    if (!setting.groupId && (setting.toDate || setting.fromDate)) throw new Error(`MdsPersianDateTimePicker => When you set 'toDate' or 'fromDate' true, you have to set 'groupId'`);

    if (!setting.textFormat) {
      setting.textFormat = 'yyyy/MM/dd';
      if (setting.enableTimePicker)
        setting.textFormat += ' HH:mm';
    }
    if (!setting.dateFormat) {
      setting.dateFormat = 'yyyy/MM/dd';
      if (setting.enableTimePicker)
        setting.dateFormat += ' HH:mm';
    }
    if (setting.yearOffset > 15)
      setting.yearOffset = 15;

    this.setting = setting;
    this.setting.selectedDate = setting.selectedDate ? this.getClonedDate(setting.selectedDate) : null;
    this.setting.selectedDateToShow = setting.selectedDateToShow ? this.getClonedDate(setting.selectedDateToShow) : this.getClonedDate(setting.selectedDate);

    this.guid = this.newGuid();
    this.element = element;
    this.element.setAttribute("data-mds-dtp-guid", this.guid);
    MdsPersianDateTimePickerData.set(this.guid, this);

    this.initializeBsPopover(setting);
  }

  // #region jalali calendar

  private toJalali(gy: number, gm: number, gd: number) {
    return this.d2j(this.g2d(gy, gm, gd));
  }
  private toGregorian(jy: number, jm: number, jd: number) {
    return this.d2g(this.j2d(jy, jm, jd));
  }
  private isValidJalaliDate(jy: number, jm: number, jd: number) {
    return jy >= -61 && jy <= 3177 &&
      jm >= 1 && jm <= 12 &&
      jd >= 1 && jd <= this.jalaliMonthLength(jy, jm);
  }
  private isLeapJalaliYear(jy: number) {
    return this.jalCal(jy).leap === 0;
  }
  private jalaliMonthLength(jy: number, jm: number) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    if (this.isLeapJalaliYear(jy)) return 30;
    return 29;
  }
  private jalCal(jy: number) {
    // Jalali years starting the 33-year rule.
    let breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178],
      bl = breaks.length,
      gy = jy + 621,
      leapJ = -14,
      jp = breaks[0],
      jm,
      jump = 1,
      leap,
      n,
      i;

    if (jy < jp || jy >= breaks[bl - 1])
      throw new Error('Invalid Jalali year ' + jy);

    // Find the limiting years for the Jalali year jy.
    for (i = 1; i < bl; i += 1) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm)
        break;
      leapJ = leapJ + this.div(jump, 33) * 8 + this.div(this.mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;

    // Find the number of leap years from AD 621 to the beginning
    // of the current Jalali year in the Persian calendar.
    leapJ = leapJ + this.div(n, 33) * 8 + this.div(this.mod(n, 33) + 3, 4);
    if (this.mod(jump, 33) === 4 && jump - n === 4)
      leapJ += 1;

    // And the same in the Gregorian calendar (until the year gy).
    let leapG = this.div(gy, 4) - this.div((this.div(gy, 100) + 1) * 3, 4) - 150;

    // Determine the Gregorian date of Farvardin the 1st.
    let march = 20 + leapJ - leapG;

    // Find how many years have passed since the last leap year.
    if (jump - n < 6)
      n = n - jump + this.div(jump + 4, 33) * 33;
    leap = this.mod(this.mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;

    return {
      leap: leap,
      gy: gy,
      march: march
    };
  }
  private j2d(jy: number, jm: number, jd: number) {
    let r = this.jalCal(jy);
    return this.g2d(r.gy, 3, r.march) + (jm - 1) * 31 - this.div(jm, 7) * (jm - 7) + jd - 1;
  }
  private d2j(jdn: number) {
    let gy = this.d2g(jdn).gy, // Calculate Gregorian year (gy).
      jy = gy - 621,
      r = this.jalCal(jy),
      jdn1F = this.g2d(gy, 3, r.march),
      jd,
      jm,
      k;

    // Find number of days that passed since 1 Farvardin.
    k = jdn - jdn1F;
    if (k >= 0) {
      if (k <= 185) {
        // The first 6 months.
        jm = 1 + this.div(k, 31);
        jd = this.mod(k, 31) + 1;
        return {
          jy: jy,
          jm: jm,
          jd: jd
        };
      } else {
        // The remaining months.
        k -= 186;
      }
    } else {
      // Previous Jalali year.
      jy -= 1;
      k += 179;
      if (r.leap === 1)
        k += 1;
    }
    jm = 7 + this.div(k, 30);
    jd = this.mod(k, 30) + 1;
    return {
      jy: jy,
      jm: jm,
      jd: jd
    };
  }
  private g2d(gy: number, gm: number, gd: number) {
    let d = this.div((gy + this.div(gm - 8, 6) + 100100) * 1461, 4) +
      this.div(153 * this.mod(gm + 9, 12) + 2, 5) +
      gd - 34840408;
    d = d - this.div(this.div(gy + 100100 + this.div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }
  private d2g(jdn: number) {
    let j;
    j = 4 * jdn + 139361631;
    j = j + this.div(this.div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    let i = this.div(this.mod(j, 1461), 4) * 5 + 308;
    let gd = this.div(this.mod(i, 153), 5) + 1;
    let gm = this.mod(this.div(i, 153), 12) + 1;
    let gy = this.div(j, 1461) - 100100 + this.div(8 - gm, 6);
    return {
      gy: gy,
      gm: gm,
      gd: gd
    };
  }
  private div(a: number, b: number) {
    return ~~(a / b);
  }
  private mod(a: number, b: number) {
    return a - ~~(a / b) * b;
  }

  //#endregion jalali calendar

  // #region Template

  private mdDatePickerFlag = 'data-md-persian-date-time-picker';
  private mdDatePickerFlagSelector = '[' + this.mdDatePickerFlag + ']';
  private mdPersianDateTimePickerFlag = 'data-mds-dtp';
  private modalHtmlTemplate = `<div class="modal fade mds-bs-persian-datetime-picker-modal" tabindex="-1" role="dialog" aria-labelledby="mdDateTimePickerModalLabel" aria-hidden="true" ${this.mdPersianDateTimePickerFlag}>
<div class="modal-dialog modal-xl modal-dialog-centered" data-button-selector>
<div class="modal-content">
<div class="modal-body" data-name="mds-dtp-body">
MD DateTimePicker Html
</div>
</div>
</div>
</div>
  `;
  private popoverHtmlTemplate = `<div class="popover mds-bs-persian-datetime-picker-popover" role="tooltip" ${this.mdPersianDateTimePickerFlag}>
<div class="popover-arrow"></div>
<h3 class="popover-header text-center p-1" mds-dtp-title="true"></h3>
<div class="popover-body p-0" data-name="mds-dtp-body"></div>
</div>`;
  private popoverHeaderSelectYearHtmlTemplate = `<table class="table table-sm table-borderless text-center p-0 m-0 {{rtlCssClass}}" dir="{{dirAttrValue}}">
<tr>
<th>
<button type="button" class="btn btn-sm btn-light" title="{{previousText}}" data-year="{{latestPreviousYear}}" data-year-range-button-change="-1" {{prevYearButtonAttr}}> &lt; </button>
</th>
<th class="pt-3">
{{yearsRangeText}}
</th>
<th>
<button type="button" class="btn btn-sm btn-light" title="{{nextText}}" data-year="{{latestNextYear}}" data-year-range-button-change="1" {{nextYearButtonAttr}}> &gt; </button>
</th>
</tr>
</table>`;
  private dateTimePickerYearsToSelectHtmlTemplate = `<table class="table table-sm text-center p-0 m-0">
<tbody>
{{yearsBoxHtml}}
<tr>
<td colspan="100" class="text-center">
<button class="btn btn-sm btn-light" data-mds-hide-year-list-box="true">{{cancelText}}</button>
</td>
</tr>
</tbody>
</table>`;

  private dateTimePickerHtmlTemplate = `<div class="mds-bs-dtp-container {{rtlCssClass}}">
<div class="select-year-inline-box w-0" data-name="dtp-years-container">
</div>
<div class="select-year-box w-0" data-mds-dtp-year-list-box="true"></div>
<table class="table table-sm text-center p-0 m-0">
<thead>
<tr {{selectedDateStringAttribute}}>
<th mds-dtp-inline-header colspan="100">{{dtpInlineHeader}}</th>
</tr>
</thead>
<tbody>
<tr>
{{monthsTdHtml}}
</tr>
</tbody>
<tfoot>
<tr {{timePickerAttribute}}>
<td colspan="100" class="text-center border-0">
<input type="time" value="{{time}}" maxlength="2" data-mds-dtp-time />
</td>
</tr>
<tr>
<td colspan="100">
<button type="button" class="btn btn-light" title="{{goTodayText}}" data-mds-dtp-go-today>{{todayDateString}}</button>
</td>
</tr>
</tfoot>
</table>
</div>`;

  private dateTimePickerMonthTableHtmlTemplate = `<td class="border-0" style="{{monthTdStyle}}" {{monthTdAttribute}} data-td-month>
<table class="table table-sm table-striped table-borderless">
<thead>
<tr {{monthNameAttribute}}>
<th colspan="100" class="border-0">
<table class="table table-sm table-borderless">
<thead>
<tr>
<th>
<button type="button" class="btn btn-light"> {{currentMonthInfo}} </button>
</th>
</tr>
</thead>
</table>
</th>
</tr>
<tr {{theadSelectDateButtonTrAttribute}}>
<td colspan="100" class="border-0">
<table class="table table-sm table-borderless">
<tr>
<th>
<button type="button" class="btn btn-light btn-sm" title="{{previousYearText}}" data-change-date-button="true" data-number="{{previousYearButtonDateNumber}}" {{previousYearButtonDisabledAttribute}}> &lt;&lt; </button>
</th>
<th>
<button type="button" class="btn btn-light btn-sm" title="{{previousMonthText}}" data-change-date-button="true" data-number="{{previousMonthButtonDateNumber}}" {{previousMonthButtonDisabledAttribute}}> &lt; </button>
</th>
<th style="width: 120px;">
<div class="dropdown">
<button type="button" class="btn btn-light btn-sm dropdown-toggle" id="mdsBootstrapPersianDatetimePickerMonthSelectorButon"
data-bs-toggle="dropdown" aria-expanded="false">
{{selectedMonthName}}
</button>
<div class="dropdown-menu" aria-labelledby="mdsBootstrapPersianDatetimePickerMonthSelectorButon">
<a class="dropdown-item {{selectMonth1ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth1DateNumber}}">{{monthName1}}</a>
<a class="dropdown-item {{selectMonth2ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth2DateNumber}}">{{monthName2}}</a>
<a class="dropdown-item {{selectMonth3ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth3DateNumber}}">{{monthName3}}</a>
<div class="dropdown-divider"></div>
<a class="dropdown-item {{selectMonth4ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth4DateNumber}}">{{monthName4}}</a>
<a class="dropdown-item {{selectMonth5ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth5DateNumber}}">{{monthName5}}</a>
<a class="dropdown-item {{selectMonth6ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth6DateNumber}}">{{monthName6}}</a>
<div class="dropdown-divider"></div>
<a class="dropdown-item {{selectMonth7ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth7DateNumber}}">{{monthName7}}</a>
<a class="dropdown-item {{selectMonth8ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth8DateNumber}}">{{monthName8}}</a>
<a class="dropdown-item {{selectMonth9ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth9DateNumber}}">{{monthName9}}</a>
<div class="dropdown-divider"></div>
<a class="dropdown-item {{selectMonth10ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth10DateNumber}}">{{monthName10}}</a>
<a class="dropdown-item {{selectMonth11ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth11DateNumber}}">{{monthName11}}</a>
<a class="dropdown-item {{selectMonth12ButtonCssClass}}" data-change-date-button="true" data-number="{{dropDownMenuMonth12DateNumber}}">{{monthName12}}</a>
</div>
</div>
</th>
<th style="width: 50px;">
<button type="button" class="btn btn-light btn-sm" mds-pdtp-select-year-button {{selectYearButtonDisabledAttribute}}>{{selectedYear}}</button>
</th>
<th>
<button type="button" class="btn btn-light btn-sm" title="{{nextMonthText}}" data-change-date-button="true" data-number="{{nextMonthButtonDateNumber}}" {{nextMonthButtonDisabledAttribute}}> &gt; </button>
</th>
<th>
<button type="button" class="btn btn-light btn-sm" title="{{nextYearText}}" data-change-date-button="true" data-number="{{nextYearButtonDateNumber}}" {{nextYearButtonDisabledAttribute}}> &gt;&gt; </button>
</th>
</tr>
</table>
</td>
</tr>
</thead>
<tbody class="days">
<tr>
  <td class="{{weekDayShortName1CssClass}}">{{weekDayShortName1}}</td>
  <td>{{weekDayShortName2}}</td>
  <td>{{weekDayShortName3}}</td>
  <td>{{weekDayShortName4}}</td>
  <td>{{weekDayShortName5}}</td>
  <td>{{weekDayShortName6}}</td>
  <td class="{{weekDayShortName7CssClass}}">{{weekDayShortName7}}</td>
</tr>
{{daysHtml}}
</tbody>
</table>
</td>`;

  private previousYearTextPersian = 'سال قبل';
  private previousMonthTextPersian = 'ماه قبل';
  private previousTextPersian = 'قبلی';
  private nextYearTextPersian = 'سال بعد';
  private nextMonthTextPersian = 'ماه بعد';
  private nextTextPersian = 'بعدی';
  private todayTextPersian = 'امروز';
  private goTodayTextPersian = 'برو به امروز';
  private cancelTextPersian = 'انصراف';
  private currentYearTextPersian = 'سال جاری';
  private previousText = 'Previous';
  private previousYearText = 'Previous Year';
  private previousMonthText = 'Previous Month';
  private nextText = 'Next';
  private nextYearText = 'Next Year';
  private nextMonthText = 'Next Month';
  private todayText = 'Today';
  private goTodayText = 'Go Today';
  private cancelText = 'Cancel';
  private currentYearText = 'Current Year';
  private shortDayNamesPersian = [
    'ش',
    'ی',
    'د',
    'س',
    'چ',
    'پ',
    'ج',
  ];
  private shortDayNames = [
    'Su',
    'Mo',
    'Tu',
    'We',
    'Th',
    'Fr',
    'Sa',
  ];
  private monthNamesPersian = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند'
  ];
  private monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  private weekDayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];
  private weekDayNamesPersian = [
    'یک شنبه',
    'دوشنبه',
    'سه شنبه',
    'چهارشنبه',
    'پنج شنبه',
    'جمعه',
    'شنبه'
  ];

  // #endregion

  // #region Properties

  guid: string = '';
  setting: MdsPersianDateTimePickerSetting;
  private bsPopover: Popover;
  private element: Element;
  private tempTitleString = '';
  private triggerChangeCalling = false;

  // #endregion

  // #region Methods

  private initializeBsPopover(setting: MdsPersianDateTimePickerSetting): void {

    // Validation
    if (setting.rangeSelector && (setting.toDate || setting.fromDate)) throw new Error(`MdsPersianDateTimePicker => You can not set true 'toDate' or 'fromDate' and 'rangeSelector' together`);
    if (setting.toDate && setting.fromDate) throw new Error(`MdsPersianDateTimePicker => You can not set true 'toDate' and 'fromDate' together`);
    if (!setting.groupId && (setting.toDate || setting.fromDate)) throw new Error(`MdsPersianDateTimePicker => When you set 'toDate' or 'fromDate' true, you have to set 'groupId'`);
    // \\

    if (setting.disabled)
      this.element.setAttribute("disabled", '');
    if (setting.toDate || setting.fromDate) {
      this.element.setAttribute("data-mds-dtp-group", setting.groupId);
      if (setting.toDate)
        this.element.setAttribute("data-to-date", 'true');
      else if (setting.fromDate)
        this.element.setAttribute("data-from-date", 'true');
    }
    setTimeout(() => {
      this.dispose();
      const title = this.getPopoverHeaderTitle(setting);
      this.bsPopover = new Popover(this.element, {
        container: 'body',
        content: this.getDateTimePickerBodyHtml(setting),
        title: title,
        html: true,
        placement: setting.placement,
        trigger: 'manual',
        template: this.popoverHtmlTemplate,
        sanitize: false,
      });
      this.tempTitleString = title;
      this.enableMainEvents();
    }, 500);
  }
  private newGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  private extend(...args: any[]): any {
    for (let i = 1; i < args.length; i++)
      for (let key in args[i])
        if (args[i].hasOwnProperty(key))
          args[0][key] = args[i][key];
    return args[0];
  }
  private getClonedDate(dateTime: Date): Date {
    return new Date(dateTime.getTime());
  }
  private getDateTimeJson1(dateTime: Date): GetDateTimeJson1 {
    return {
      year: dateTime.getFullYear(),
      month: dateTime.getMonth() + 1,
      day: dateTime.getDate(),
      hour: dateTime.getHours(),
      minute: dateTime.getMinutes(),
      second: dateTime.getSeconds(),
      millisecond: dateTime.getMilliseconds(),
      dayOfWeek: dateTime.getDay()
    };
  }
  private getDateTimeJson2(dateNumber: number): GetDateTimeJson1 {
    return {
      year: Math.floor(dateNumber / 10000),
      month: Math.floor(dateNumber / 100) % 100,
      day: dateNumber % 100,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
      dayOfWeek: null
    };
  }
  private getDateTimeJsonPersian1(dateTime: Date): GetDateTimeJson1 {
    let persianDate = this.toJalali(dateTime.getFullYear(), dateTime.getMonth() + 1, dateTime.getDate());
    return {
      year: persianDate.jy,
      month: persianDate.jm,
      day: persianDate.jd,
      hour: dateTime.getHours(),
      minute: dateTime.getMinutes(),
      second: dateTime.getSeconds(),
      millisecond: dateTime.getMilliseconds(),
      dayOfWeek: dateTime.getDay(),
    };
  }
  private getDateTimeJsonPersian2(yearPersian: number, monthPersian: number, dayPersian: number, hour: number, minute: number, second: number): GetDateTimeJson1 {
    if (!this.isNumber(hour)) hour = 0;
    if (!this.isNumber(minute)) minute = 0;
    if (!this.isNumber(second)) second = 0;
    let gregorian = this.toGregorian(yearPersian, monthPersian, dayPersian);
    return this.getDateTimeJsonPersian1(new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd, hour, minute, second));
  }
  private getWeekDayName(englishWeekDayIndex: number, isGregorian: boolean): string {
    if (!isGregorian) return this.weekDayNamesPersian[englishWeekDayIndex];
    return this.weekDayNames[englishWeekDayIndex];
  }
  private getMonthName(monthIndex: number, isGregorian: boolean): string {
    if (monthIndex < 0)
      monthIndex = 11;
    else if (monthIndex > 11)
      monthIndex = 0;
    if (!isGregorian) return this.monthNamesPersian[monthIndex];
    return this.monthNames[monthIndex];
  }
  private getWeekDayShortName(englishWeekDayIndex: number, isGregorian: boolean): string {
    if (!isGregorian)
      return this.shortDayNamesPersian[englishWeekDayIndex];
    return this.shortDayNames[englishWeekDayIndex];
  }
  private isLeapYear(persianYear: number): boolean {
    return this.isLeapJalaliYear(persianYear);
  }
  private getDaysInMonthPersian(year: number, month: number): number {
    let numberOfDaysInMonth = 31;
    if (month > 6 && month < 12)
      numberOfDaysInMonth = 30;
    else if (month == 12)
      numberOfDaysInMonth = this.isLeapYear(year) ? 30 : 29;
    return numberOfDaysInMonth;
  }
  private getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }
  private getLastDayDateOfPreviousMonth(dateTime: Date, isGregorian: boolean): Date {
    let dateTimeLocal = this.getClonedDate(dateTime);
    if (isGregorian) {
      let previousMonth = new Date(dateTimeLocal.getFullYear(), dateTimeLocal.getMonth() - 1, 1),
        daysInMonth = this.getDaysInMonth(previousMonth.getFullYear(), previousMonth.getMonth());
      return new Date(previousMonth.getFullYear(), previousMonth.getMonth(), daysInMonth);
    }
    let dateTimeJsonPersian = this.getDateTimeJsonPersian1(dateTimeLocal);
    dateTimeJsonPersian.month += -1;
    if (dateTimeJsonPersian.month <= 0) {
      dateTimeJsonPersian.month = 12;
      dateTimeJsonPersian.year--;
    } else if (dateTimeJsonPersian.month > 12) {
      dateTimeJsonPersian.year++;
      dateTimeJsonPersian.month = 1;
    }
    return this.getDateTime1(dateTimeJsonPersian.year, dateTimeJsonPersian.month, this.getDaysInMonthPersian(dateTimeJsonPersian.year, dateTimeJsonPersian.month));
  }
  private getFirstDayDateOfNextMonth(dateTime: Date, isGregorian: boolean): Date {
    let dateTimeLocal = this.getClonedDate(dateTime);
    if (isGregorian) {
      let nextMonth = new Date(dateTimeLocal.getFullYear(), dateTimeLocal.getMonth() + 1, 1);
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    }
    let dateTimeJsonPersian = this.getDateTimeJsonPersian1(dateTimeLocal);
    dateTimeJsonPersian.month += 1;
    if (dateTimeJsonPersian.month <= 0) {
      dateTimeJsonPersian.month = 12;
      dateTimeJsonPersian.year--;
    }
    if (dateTimeJsonPersian.month > 12) {
      dateTimeJsonPersian.year++;
      dateTimeJsonPersian.month = 1;
    }
    return this.getDateTime1(dateTimeJsonPersian.year, dateTimeJsonPersian.month, 1);
  }
  private getDateTime1(yearPersian: number, monthPersian: number, dayPersian: number, hour?: number, minute?: number, second?: number): Date {
    if (!this.isNumber(hour)) hour = 0;
    if (!this.isNumber(minute)) minute = 0;
    if (!this.isNumber(second)) second = 0;
    let gregorian = this.toGregorian(yearPersian, monthPersian, dayPersian);
    return new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd, hour, minute, second);
  }
  private getDateTime2(dateTimeJsonPersian: GetDateTimeJson1): Date {
    if (!dateTimeJsonPersian.hour) dateTimeJsonPersian.hour = 0;
    if (!dateTimeJsonPersian.minute) dateTimeJsonPersian.minute = 0;
    if (!dateTimeJsonPersian.second) dateTimeJsonPersian.second = 0;
    let gregorian = this.toGregorian(dateTimeJsonPersian.year, dateTimeJsonPersian.month, dateTimeJsonPersian.day);
    return new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd, dateTimeJsonPersian.hour, dateTimeJsonPersian.minute, dateTimeJsonPersian.second);
  }
  private getDateTime3(dateTimeJson: GetDateTimeJson1): Date {
    return new Date(dateTimeJson.year, dateTimeJson.month - 1, dateTimeJson.day, dateTimeJson.hour, dateTimeJson.minute, dateTimeJson.second);
  }
  private getDateTime4(dateNumber: number, dateTime: Date, isGregorian: boolean): Date {
    let dateTimeJson = this.getDateTimeJson2(dateNumber);
    if (!isGregorian) {
      let dateTimeJsonPersian = this.getDateTimeJsonPersian1(dateTime);
      dateTimeJsonPersian.year = dateTimeJson.year;
      dateTimeJsonPersian.month = dateTimeJson.month;
      dateTimeJsonPersian.day = dateTimeJson.day;
      dateTime = this.getDateTime2(dateTimeJsonPersian);
    } else
      dateTime = new Date(dateTimeJson.year, dateTimeJson.month - 1, dateTimeJson.day,
        dateTime.getHours(), dateTime.getMinutes(), dateTime.getSeconds());
    return dateTime;
  }
  private getLesserDisableBeforeDate(setting: MdsPersianDateTimePickerSetting): GetDateTimeJson1 {
    // دریافت تاریخ کوچکتر
    // از بین تاریخ های غیر فعال شده در گذشته
    let resultDate: Date = null;
    const dateNow = new Date();
    if (setting.disableBeforeToday && setting.disableBeforeDate) {
      if (setting.disableBeforeDate.getTime() <= dateNow.getTime())
        resultDate = this.getClonedDate(setting.disableBeforeDate);
      else
        resultDate = dateNow;
    } else if (setting.disableBeforeDate)
      resultDate = this.getClonedDate(setting.disableBeforeDate);
    else if (setting.disableBeforeToday)
      resultDate = dateNow;
    if (resultDate == null)
      return null;
    if (setting.isGregorian)
      return this.getDateTimeJson1(resultDate);
    return this.getDateTimeJsonPersian1(resultDate);
  }
  private getBiggerDisableAfterDate(setting: MdsPersianDateTimePickerSetting): GetDateTimeJson1 {
    // دریافت تاریخ بزرگتر
    // از بین تاریخ های غیر فعال شده در آینده
    let resultDate: Date = null;
    const dateNow = new Date();
    if (setting.disableAfterDate && setting.disableAfterToday) {
      if (setting.disableAfterDate.getTime() >= dateNow.getTime())
        resultDate = this.getClonedDate(setting.disableAfterDate);
      else
        resultDate = dateNow;
    } else if (setting.disableAfterDate)
      resultDate = this.getClonedDate(setting.disableAfterDate);
    else if (setting.disableAfterToday)
      resultDate = dateNow;
    if (resultDate == null)
      return null;
    if (setting.isGregorian)
      return this.getDateTimeJson1(resultDate);
    return this.getDateTimeJsonPersian1(resultDate);
  }
  private addMonthToDateTimeJson(dateTimeJson: GetDateTimeJson1, addedMonth: number, isGregorian: boolean): GetDateTimeJson1 {
    // وقتی نیاز هست تا ماه یا روز به تاریخی اضافه کنم
    // پس از اضافه کردن ماه یا روز این متد را استفاده میکنم تا سال و ماه
    // با مقادیر جدید تصحیح و برگشت داده شوند
    const dateTimeJson1 = Object.assign({}, dateTimeJson);
    dateTimeJson1.day = 1;
    dateTimeJson1.month += addedMonth;
    if (!isGregorian) {
      if (dateTimeJson1.month <= 0) {
        dateTimeJson1.month = 12;
        dateTimeJson1.year--;
      }
      if (dateTimeJson1.month > 12) {
        dateTimeJson1.year++;
        dateTimeJson1.month = 1;
      }
      return dateTimeJson1;
    }
    return this.getDateTimeJson1(this.getDateTime3(dateTimeJson1));
  }
  private convertToNumber1(dateTimeJson: GetDateTimeJson1): number {
    return Number(this.zeroPad(dateTimeJson.year) + this.zeroPad(dateTimeJson.month) + this.zeroPad(dateTimeJson.day));
  }
  private convertToNumber2(year: number, month: number, day: number): number {
    return Number(this.zeroPad(year) + this.zeroPad(month) + this.zeroPad(day));
  }
  private convertToNumber3(dateTime: Date): number {
    return this.convertToNumber1(this.getDateTimeJson1(dateTime));
  }
  private convertToNumber4(dateTime: Date): number {
    return Number(this.zeroPad(dateTime.getFullYear()) + this.zeroPad(dateTime.getMonth()) + this.zeroPad(dateTime.getDate()));
  }
  private getShortHour(hour: number): number {
    let shortHour;
    if (hour > 12)
      shortHour = hour - 12;
    else
      shortHour = hour;
    return shortHour;
  }
  private getAmPm(hour: number, isGregorian: boolean): string {
    let amPm;
    if (hour > 12) {
      if (isGregorian)
        amPm = 'PM';
      else
        amPm = 'ب.ظ';
    } else
      if (isGregorian)
        amPm = 'AM';
      else
        amPm = 'ق.ظ';
    return amPm;
  }
  private addMonthToDateTime(dateTime: Date, addedMonth: number, isGregorian: boolean): Date {
    let dateTimeJson: GetDateTimeJson1;
    if (!isGregorian) {
      dateTimeJson = this.getDateTimeJsonPersian1(dateTime);
      dateTimeJson = this.addMonthToDateTimeJson(dateTimeJson, addedMonth, isGregorian);
      return this.getDateTime2(dateTimeJson);
    }
    dateTimeJson = this.getDateTimeJson1(dateTime);
    dateTimeJson = this.addMonthToDateTimeJson(dateTimeJson, addedMonth, isGregorian);
    return this.getDateTime3(dateTimeJson);
  }
  private isNumber(n: any): boolean {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
  private toPersianNumber(inputNumber1: number | string): string {
    /* ۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹ */
    if (!inputNumber1) return '';
    let str1 = inputNumber1.toString().trim();
    if (!str1) return '';
    str1 = str1.replace(/0/img, '۰');
    str1 = str1.replace(/1/img, '۱');
    str1 = str1.replace(/2/img, '۲');
    str1 = str1.replace(/3/img, '۳');
    str1 = str1.replace(/4/img, '۴');
    str1 = str1.replace(/5/img, '۵');
    str1 = str1.replace(/6/img, '۶');
    str1 = str1.replace(/7/img, '۷');
    str1 = str1.replace(/8/img, '۸');
    str1 = str1.replace(/9/img, '۹');
    return str1;
  }
  private toEnglishNumber(inputNumber2: number | string): string {
    if (!inputNumber2) return '';
    let str = inputNumber2.toString().trim();
    if (!str) return '';
    str = str.replace(/۰/img, '0');
    str = str.replace(/۱/img, '1');
    str = str.replace(/۲/img, '2');
    str = str.replace(/۳/img, '3');
    str = str.replace(/۴/img, '4');
    str = str.replace(/۵/img, '5');
    str = str.replace(/۶/img, '6');
    str = str.replace(/۷/img, '7');
    str = str.replace(/۸/img, '8');
    str = str.replace(/۹/img, '9');
    return str;
  }
  private zeroPad(nr: any, base?: string): string {
    if (nr == undefined || nr == '') return '00';
    if (base == undefined || base == '') base = '00';
    let len = (String(base).length - String(nr).length) + 1;
    return len > 0 ? new Array(len).join('0') + nr : nr;
  }
  private getDateTimeString(dateTimeJson: GetDateTimeJson1, format: string, isGregorian: boolean, englishNumber: boolean): string {

    if (isGregorian) englishNumber = true;

    /// فرمت های که پشتیبانی می شوند
    /// <para />
    /// yyyy: سال چهار رقمی
    /// <para />
    /// yy: سال دو رقمی
    /// <para />
    /// MMMM: نام فارسی ماه
    /// <para />
    /// MM: عدد دو رقمی ماه
    /// <para />
    /// M: عدد یک رقمی ماه
    /// <para />
    /// dddd: نام فارسی روز هفته
    /// <para />
    /// dd: عدد دو رقمی روز ماه
    /// <para />
    /// d: عدد یک رقمی روز ماه
    /// <para />
    /// HH: ساعت دو رقمی با فرمت 00 تا 24
    /// <para />
    /// H: ساعت یک رقمی با فرمت 0 تا 24
    /// <para />
    /// hh: ساعت دو رقمی با فرمت 00 تا 12
    /// <para />
    /// h: ساعت یک رقمی با فرمت 0 تا 12
    /// <para />
    /// mm: عدد دو رقمی دقیقه
    /// <para />
    /// m: عدد یک رقمی دقیقه
    /// <para />
    /// ss: ثانیه دو رقمی
    /// <para />
    /// s: ثانیه یک رقمی
    /// <para />
    /// fff: میلی ثانیه 3 رقمی
    /// <para />
    /// ff: میلی ثانیه 2 رقمی
    /// <para />
    /// f: میلی ثانیه یک رقمی
    /// <para />
    /// tt: ب.ظ یا ق.ظ
    /// <para />
    /// t: حرف اول از ب.ظ یا ق.ظ

    format = format.replace(/yyyy/mg, dateTimeJson.year.toString());
    format = format.replace(/yy/mg, (dateTimeJson.year % 100).toString());
    format = format.replace(/MMMM/mg, this.getMonthName(dateTimeJson.month - 1, isGregorian));
    format = format.replace(/MM/mg, this.zeroPad(dateTimeJson.month));
    format = format.replace(/M/mg, dateTimeJson.month.toString());
    format = format.replace(/dddd/mg, this.getWeekDayName(dateTimeJson.dayOfWeek, isGregorian));
    format = format.replace(/dd/mg, this.zeroPad(dateTimeJson.day));
    format = format.replace(/d/mg, dateTimeJson.day.toString());
    format = format.replace(/HH/mg, this.zeroPad(dateTimeJson.hour));
    format = format.replace(/H/mg, dateTimeJson.hour.toString());
    format = format.replace(/hh/mg, this.zeroPad(this.getShortHour(dateTimeJson.hour).toString()));
    format = format.replace(/h/mg, this.zeroPad(dateTimeJson.hour));
    format = format.replace(/mm/mg, this.zeroPad(dateTimeJson.minute));
    format = format.replace(/m/mg, dateTimeJson.minute.toString());
    format = format.replace(/ss/mg, this.zeroPad(dateTimeJson.second));
    format = format.replace(/s/mg, dateTimeJson.second.toString());
    format = format.replace(/fff/mg, this.zeroPad(dateTimeJson.millisecond, '000'));
    format = format.replace(/ff/mg, this.zeroPad(dateTimeJson.millisecond / 10));
    format = format.replace(/f/mg, (dateTimeJson.millisecond / 100).toString());
    format = format.replace(/tt/mg, this.getAmPm(dateTimeJson.hour, isGregorian));
    format = format.replace(/t/mg, this.getAmPm(dateTimeJson.hour, isGregorian)[0]);

    if (!englishNumber) format = this.toPersianNumber(format);
    return format;
  }
  private getSelectedDateTimeTextFormatted(setting: MdsPersianDateTimePickerSetting): string {
    if (setting.selectedDate == undefined) return '';
    if (setting.rangeSelector && setting.rangeSelectorStartDate != undefined && setting.rangeSelectorEndDate != undefined)
      return this.getDateTimeString(!setting.isGregorian ? this.getDateTimeJsonPersian1(setting.rangeSelectorStartDate) : this.getDateTimeJson1(setting.rangeSelectorStartDate), setting.textFormat, setting.isGregorian, setting.isGregorian) + ' - ' +
        this.getDateTimeString(!setting.isGregorian ? this.getDateTimeJsonPersian1(setting.rangeSelectorEndDate) : this.getDateTimeJson1(setting.rangeSelectorEndDate), setting.textFormat, setting.isGregorian, setting.isGregorian);
    return this.getDateTimeString(!setting.isGregorian ? this.getDateTimeJsonPersian1(setting.selectedDate) : this.getDateTimeJson1(setting.selectedDate), setting.textFormat, setting.isGregorian, setting.isGregorian);
  }
  private getSelectedDateFormatted(setting: MdsPersianDateTimePickerSetting): string {
    // دریافت رشته تاریخ انتخاب شده
    if ((!setting.rangeSelector && !setting.selectedDate == undefined) ||
      (setting.rangeSelector && setting.rangeSelectorStartDate == undefined && setting.rangeSelectorEndDate == undefined)) return '';
    if (setting.rangeSelector)
      return this.getDateTimeString(this.getDateTimeJson1(setting.rangeSelectorStartDate), setting.dateFormat, true, true) + ' - ' +
        this.getDateTimeString(this.getDateTimeJson1(setting.rangeSelectorEndDate), setting.dateFormat, true, true);
    return this.getDateTimeString(this.getDateTimeJson1(setting.selectedDate), setting.dateFormat, true, true);
  }
  private getDisabledDateObject(setting: MdsPersianDateTimePickerSetting): [GetDateTimeJson1 | undefined, GetDateTimeJson1 | undefined] {
    let disableBeforeDateTimeJson = this.getLesserDisableBeforeDate(setting);
    let disableAfterDateTimeJson = this.getBiggerDisableAfterDate(setting);
    // بررسی پراپرتی های از تاریخ، تا تاریخ
    if ((setting.fromDate || setting.toDate) && setting.groupId) {
      const toDateElement = document.querySelector('[data-mds-dtp-group="' + setting.groupId + '"][data-to-date]');
      const fromDateElement = document.querySelector('[data-mds-dtp-group="' + setting.groupId + '"][data-from-date]');
      if (toDateElement != null && setting.fromDate) {
        const toDateSetting = MdsPersianDateTimePicker.getInstance(toDateElement).setting;
        const toDateSelectedDate = toDateSetting.selectedDate;
        disableAfterDateTimeJson = !toDateSelectedDate ? undefined : setting.isGregorian ? this.getDateTimeJson1(toDateSelectedDate) : this.getDateTimeJsonPersian1(toDateSelectedDate);
      } else if (fromDateElement != null && setting.toDate) {
        const fromDateSetting = MdsPersianDateTimePicker.getInstance(fromDateElement).setting;
        const fromDateSelectedDate = fromDateSetting.selectedDate;
        disableBeforeDateTimeJson = !fromDateSelectedDate ? undefined : setting.isGregorian ? this.getDateTimeJson1(fromDateSelectedDate) : this.getDateTimeJsonPersian1(fromDateSelectedDate);
      }
    }
    return [disableBeforeDateTimeJson, disableAfterDateTimeJson];
  }
  private setSelectedData(setting: MdsPersianDateTimePickerSetting): void {
    const targetTextElement = setting.targetTextSelector ? document.querySelector(setting.targetTextSelector) : undefined;
    const targetDateElement = setting.targetDateSelector ? document.querySelector(setting.targetDateSelector) : undefined;
    const changeEvent = new Event('change');
    if (targetTextElement != undefined) {
      this.triggerChangeCalling = true;
      const dateTimeTextFormat = this.getSelectedDateTimeTextFormatted(setting);
      switch (targetTextElement.tagName.toLowerCase()) {
        case 'input':
          (<any>targetTextElement).value = dateTimeTextFormat;
          break;
        default:
          targetTextElement.innerHTML = dateTimeTextFormat;
          break;
      }
      targetTextElement.dispatchEvent(changeEvent);
    }
    if (targetDateElement != undefined) {
      const dateTimeFormat = this.getSelectedDateFormatted(setting);
      this.triggerChangeCalling = true;
      switch (targetDateElement.tagName.toLowerCase()) {
        case 'input':
          (<any>targetDateElement).value = dateTimeFormat;
          break;
        default:
          targetDateElement.innerHTML = dateTimeFormat;
          break;
      }
      targetDateElement.dispatchEvent(changeEvent);
    }
  }
  private getPopover(element: Element): Element {
    let popoverId = element.getAttribute('aria-describedby');
    if (popoverId == undefined || popoverId == '')
      return element.closest('[data-mds-dtp]');
    return document.getElementById(popoverId.toString());
  }
  private getYearsBoxBodyHtml(setting: MdsPersianDateTimePickerSetting, yearToStart: number): MdsPersianDateTimePickerYearToSelect {
    // بدست آوردن اچ تی ام ال انتخاب سال
    // yearToStart سال شروع

    const selectedDateToShow = this.getClonedDate(setting.selectedDateToShow);
    const disabledDateObj = this.getDisabledDateObject(setting);
    const disableBeforeDateTimeJson = disabledDateObj[0];
    const disableAfterDateTimeJson = disabledDateObj[1];
    let html = this.dateTimePickerYearsToSelectHtmlTemplate;
    let yearsBoxHtml = '';
    let todayDateTimeJson: GetDateTimeJson1;
    let selectedDateTimeToShowJson: GetDateTimeJson1;
    let counter = 1;

    if (setting.isGregorian) {
      selectedDateTimeToShowJson = this.getDateTimeJson1(selectedDateToShow);
      todayDateTimeJson = this.getDateTimeJson1(new Date());
    } else {
      selectedDateTimeToShowJson = this.getDateTimeJsonPersian1(selectedDateToShow);
      todayDateTimeJson = this.getDateTimeJsonPersian1(new Date());
    }
    counter = 1;
    const yearStart = yearToStart ? yearToStart : todayDateTimeJson.year - setting.yearOffset;
    const yearEnd = yearToStart ? yearToStart + setting.yearOffset * 2 : todayDateTimeJson.year + setting.yearOffset;
    for (let i = yearStart; i < yearEnd; i++) {
      const disabledAttr = i < disableBeforeDateTimeJson?.year || i > disableAfterDateTimeJson?.year ? 'disabled' : '';
      let currentYearDateTimeJson = this.getDateTimeJson2(this.convertToNumber2(i, selectedDateTimeToShowJson.month, this.getDaysInMonthPersian(i, selectedDateTimeToShowJson.month)));
      let currentYearDisabledAttr = '';
      let yearText = setting.isGregorian ? i.toString() : this.toPersianNumber(i);
      let yearDateNumber = this.convertToNumber2(i, selectedDateTimeToShowJson.month, 1);
      let todayAttr = todayDateTimeJson.year == i ? 'data-current-year="true"' : ''
      let selectedYearAttr = selectedDateTimeToShowJson.year == i ? 'data-selected-year' : ''
      let selectedYearTitle = '';
      if (todayAttr)
        selectedYearTitle = setting.isGregorian ? this.currentYearText : this.currentYearTextPersian;
      if (disableBeforeDateTimeJson != undefined && disableBeforeDateTimeJson.year != undefined && currentYearDateTimeJson.year < disableBeforeDateTimeJson.year)
        currentYearDisabledAttr = 'disabled';
      if (disableAfterDateTimeJson != undefined && disableAfterDateTimeJson.year != undefined && currentYearDateTimeJson.year > disableAfterDateTimeJson.year)
        currentYearDisabledAttr = 'disabled';
      if (setting.disableBeforeToday && currentYearDateTimeJson.year < todayDateTimeJson.year)
        currentYearDisabledAttr = 'disabled';
      if (setting.disableAfterToday && currentYearDateTimeJson.year > todayDateTimeJson.year)
        currentYearDisabledAttr = 'disabled';
      if (counter == 1) yearsBoxHtml += '<tr>';
      yearsBoxHtml += `
<td class="text-center" title="${selectedYearTitle}" ${todayAttr} ${selectedYearAttr}>
  <button class="btn btn-sm btn-light" type="button" data-change-date-button="true" data-number="${yearDateNumber}" ${currentYearDisabledAttr} ${disabledAttr}>${yearText}</button>
</td>
`;
      if (counter == 5) yearsBoxHtml += '</tr>';
      counter++;
      if (counter > 5) counter = 1;
    }
    html = html.replace(/\{\{yearsBoxHtml\}\}/img, yearsBoxHtml);
    html = html.replace(/\{\{cancelText\}\}/img, setting.isGregorian ? this.cancelText : this.cancelTextPersian);
    return {
      yearStart,
      yearEnd,
      html
    };
  }
  private getYearsBoxHeaderHtml(setting: MdsPersianDateTimePickerSetting, yearStart: number, yearEnd: number): string {
    const yearsRangeText = ` ${yearStart} - ${yearEnd - 1} `;
    const disabledDateObj = this.getDisabledDateObject(setting);
    let html = this.popoverHeaderSelectYearHtmlTemplate;
    html = html.replace(/\{{rtlCssClass\}\}/img, setting.isGregorian ? '' : 'rtl');
    html = html.replace(/\{{dirAttrValue\}\}/img, setting.isGregorian ? 'ltr' : 'rtl');
    html = html.replace(/\{\{yearsRangeText\}\}/img, setting.isGregorian ? yearsRangeText : this.toPersianNumber(yearsRangeText));
    html = html.replace(/\{\{previousText\}\}/img, setting.isGregorian ? this.previousText : this.previousTextPersian);
    html = html.replace(/\{\{nextText\}\}/img, setting.isGregorian ? this.nextText : this.nextTextPersian);
    html = html.replace(/\{\{latestPreviousYear\}\}/img, yearStart > yearEnd ? yearEnd.toString() : yearStart.toString());
    html = html.replace(/\{\{latestNextYear\}\}/img, yearStart > yearEnd ? yearStart.toString() : yearEnd.toString());
    html = html.replace(/\{\{prevYearButtonAttr\}\}/img, disabledDateObj[0] != null && yearStart - 1 < disabledDateObj[0].year ? 'disabled' : '');
    html = html.replace(/\{\{nextYearButtonAttr\}\}/img, disabledDateObj[1] != null && yearEnd + 1 > disabledDateObj[1].year ? 'disabled' : '');
    return html;
  }
  private getDateTimePickerMonthHtml(setting: MdsPersianDateTimePickerSetting, isNextMonth: boolean, isPrevMonth: boolean): string {
    let selectedDateToShow = this.getClonedDate(setting.selectedDateToShow);
    let selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
    let selectedDateTime = setting.selectedDate != undefined ? this.getClonedDate(setting.selectedDate) : undefined;
    let isNextOrPrevMonth = isNextMonth || isPrevMonth;
    let html = this.dateTimePickerMonthTableHtmlTemplate;

    html = html.replace(/\{\{monthTdAttribute\}\}/img, isNextMonth ? 'data-next-month' : isPrevMonth ? 'data-prev-month' : '');
    html = html.replace(/\{\{monthNameAttribute\}\}/img, !isNextOrPrevMonth ? 'hidden' : '');
    html = html.replace(/\{\{theadSelectDateButtonTrAttribute\}\}/img, setting.inLine || !isNextOrPrevMonth ? '' : 'hidden');
    html = html.replace(/\{\{weekDayShortName1CssClass\}\}/img, setting.isGregorian ? 'text-danger' : '');
    html = html.replace(/\{\{weekDayShortName7CssClass\}\}/img, !setting.isGregorian ? 'text-danger' : '');
    html = html.replace(/\{\{previousYearText\}\}/img, setting.isGregorian ? this.previousYearText : this.previousYearTextPersian);
    html = html.replace(/\{\{previousMonthText\}\}/img, setting.isGregorian ? this.previousMonthText : this.previousMonthTextPersian);
    html = html.replace(/\{\{nextMonthText\}\}/img, setting.isGregorian ? this.nextMonthText : this.nextMonthTextPersian);
    html = html.replace(/\{\{nextYearText\}\}/img, setting.isGregorian ? this.nextYearText : this.nextYearTextPersian);
    html = html.replace(/\{\{monthName1\}\}/img, this.getMonthName(0, setting.isGregorian));
    html = html.replace(/\{\{monthName2\}\}/img, this.getMonthName(1, setting.isGregorian));
    html = html.replace(/\{\{monthName3\}\}/img, this.getMonthName(2, setting.isGregorian));
    html = html.replace(/\{\{monthName4\}\}/img, this.getMonthName(3, setting.isGregorian));
    html = html.replace(/\{\{monthName5\}\}/img, this.getMonthName(4, setting.isGregorian));
    html = html.replace(/\{\{monthName6\}\}/img, this.getMonthName(5, setting.isGregorian));
    html = html.replace(/\{\{monthName7\}\}/img, this.getMonthName(6, setting.isGregorian));
    html = html.replace(/\{\{monthName8\}\}/img, this.getMonthName(7, setting.isGregorian));
    html = html.replace(/\{\{monthName9\}\}/img, this.getMonthName(8, setting.isGregorian));
    html = html.replace(/\{\{monthName10\}\}/img, this.getMonthName(9, setting.isGregorian));
    html = html.replace(/\{\{monthName11\}\}/img, this.getMonthName(10, setting.isGregorian));
    html = html.replace(/\{\{monthName12\}\}/img, this.getMonthName(11, setting.isGregorian));
    html = html.replace(/\{\{weekDayShortName1\}\}/img, this.getWeekDayShortName(0, setting.isGregorian));
    html = html.replace(/\{\{weekDayShortName2\}\}/img, this.getWeekDayShortName(1, setting.isGregorian));
    html = html.replace(/\{\{weekDayShortName3\}\}/img, this.getWeekDayShortName(2, setting.isGregorian));
    html = html.replace(/\{\{weekDayShortName4\}\}/img, this.getWeekDayShortName(3, setting.isGregorian));
    html = html.replace(/\{\{weekDayShortName5\}\}/img, this.getWeekDayShortName(4, setting.isGregorian));
    html = html.replace(/\{\{weekDayShortName6\}\}/img, this.getWeekDayShortName(5, setting.isGregorian));
    html = html.replace(/\{\{weekDayShortName7\}\}/img, this.getWeekDayShortName(6, setting.isGregorian));

    const disabledDateObj = this.getDisabledDateObject(setting);
    let i = 0,
      j = 0,
      firstWeekDayNumber,
      cellNumber = 0,
      tdNumber = 0,
      selectedDateNumber = 0,
      selectedMonthName = '',
      todayDateTimeJson: GetDateTimeJson1, // year, month, day, hour, minute, second
      dateTimeToShowJson: GetDateTimeJson1, // year, month, day, hour, minute, second
      numberOfDaysInCurrentMonth = 0,
      numberOfDaysInPreviousMonth = 0,
      tr = document.createElement('TR'),
      td = document.createElement("TD"),
      daysHtml = '',
      currentDateNumber = 0,
      previousMonthDateNumber = 0,
      nextMonthDateNumber = 0,
      previousYearDateNumber = 0,
      nextYearDateNumber = 0,
      rangeSelectorStartDate = !setting.rangeSelector || setting.rangeSelectorStartDate == undefined ? undefined : this.getClonedDate(setting.rangeSelectorStartDate),
      rangeSelectorEndDate = !setting.rangeSelector || setting.rangeSelectorEndDate == undefined ? undefined : this.getClonedDate(setting.rangeSelectorEndDate),
      rangeSelectorStartDateNumber = 0,
      rangeSelectorEndDateNumber = 0,
      dayNumberInString = '0',
      dayOfWeek = '', // نام روز هفته
      monthsDateNumberAndAttr: any = {
        month1DateNumber: 0,
        month2DateNumber: 0,
        month3DateNumber: 0,
        month4DateNumber: 0,
        month5DateNumber: 0,
        month6DateNumber: 0,
        month7DateNumber: 0,
        month8DateNumber: 0,
        month9DateNumber: 0,
        month10DateNumber: 0,
        month11DateNumber: 0,
        month12DateNumber: 0,
        selectMonth1ButtonCssClass: '',
        selectMonth2ButtonCssClass: '',
        selectMonth3ButtonCssClass: '',
        selectMonth4ButtonCssClass: '',
        selectMonth5ButtonCssClass: '',
        selectMonth6ButtonCssClass: '',
        selectMonth7ButtonCssClass: '',
        selectMonth8ButtonCssClass: '',
        selectMonth9ButtonCssClass: '',
        selectMonth10ButtonCssClass: '',
        selectMonth11ButtonCssClass: '',
        selectMonth12ButtonCssClass: '',
      },
      holidaysDateNumbers: number[] = [],
      disabledDatesNumber: number[] = [],
      specialDatesNumber: number[] = [],
      disableBeforeDateTimeJson = disabledDateObj[0],
      disableAfterDateTimeJson = disabledDateObj[1],
      previousYearButtonDisabledAttribute = '',
      previousMonthButtonDisabledAttribute = '',
      selectYearButtonDisabledAttribute = '',
      nextMonthButtonDisabledAttribute = '',
      nextYearButtonDisabledAttribute = '',
      isTrAppended = false;

    if (setting.isGregorian) {
      dateTimeToShowJson = this.getDateTimeJson1(selectedDateToShowTemp);
      todayDateTimeJson = this.getDateTimeJson1(new Date());
      firstWeekDayNumber = new Date(dateTimeToShowJson.year, dateTimeToShowJson.month - 1, 1).getDay();
      selectedDateNumber = !selectedDateTime ? 0 : this.convertToNumber1(this.getDateTimeJson1(selectedDateTime));
      numberOfDaysInCurrentMonth = this.getDaysInMonth(dateTimeToShowJson.year, dateTimeToShowJson.month - 1);
      numberOfDaysInPreviousMonth = this.getDaysInMonth(dateTimeToShowJson.year, dateTimeToShowJson.month - 2);
      previousMonthDateNumber = this.convertToNumber1(this.getDateTimeJson1(this.getLastDayDateOfPreviousMonth(selectedDateToShowTemp, true)));
      nextMonthDateNumber = this.convertToNumber1(this.getDateTimeJson1(this.getFirstDayDateOfNextMonth(selectedDateToShowTemp, true)));
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      previousYearDateNumber = this.convertToNumber1(this.getDateTimeJson1(new Date(selectedDateToShowTemp.setFullYear(selectedDateToShowTemp.getFullYear() - 1))));
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      nextYearDateNumber = this.convertToNumber1(this.getDateTimeJson1(new Date(selectedDateToShowTemp.setFullYear(selectedDateToShowTemp.getFullYear() + 1))));
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      rangeSelectorStartDateNumber = !setting.rangeSelector || !rangeSelectorStartDate ? 0 : this.convertToNumber3(rangeSelectorStartDate);
      rangeSelectorEndDateNumber = !setting.rangeSelector || !rangeSelectorEndDate ? 0 : this.convertToNumber3(rangeSelectorEndDate);
      for (i = 1; i <= 12; i++) {
        monthsDateNumberAndAttr['month' + i.toString() + 'DateNumber'] = this.convertToNumber1(this.getDateTimeJson1(new Date(selectedDateToShowTemp.setMonth(i - 1))));
        selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      }
      for (i = 0; i < setting.holidays.length; i++) {
        holidaysDateNumbers.push(this.convertToNumber1(this.getDateTimeJson1(setting.holidays[i])));
      }
      for (i = 0; i < setting.disabledDates.length; i++) {
        disabledDatesNumber.push(this.convertToNumber1(this.getDateTimeJson1(setting.disabledDates[i])));
      }
      for (i = 0; i < setting.specialDates.length; i++) {
        specialDatesNumber.push(this.convertToNumber1(this.getDateTimeJson1(setting.specialDates[i])));
      }
    } else {
      dateTimeToShowJson = this.getDateTimeJsonPersian1(selectedDateToShowTemp);
      todayDateTimeJson = this.getDateTimeJsonPersian1(new Date());
      firstWeekDayNumber = this.getDateTimeJsonPersian2(dateTimeToShowJson.year, dateTimeToShowJson.month, 1, 0, 0, 0).dayOfWeek;
      selectedDateNumber = !selectedDateTime ? 0 : this.convertToNumber1(this.getDateTimeJsonPersian1(selectedDateTime));
      numberOfDaysInCurrentMonth = this.getDaysInMonthPersian(dateTimeToShowJson.year, dateTimeToShowJson.month);
      numberOfDaysInPreviousMonth = this.getDaysInMonthPersian(dateTimeToShowJson.year - 1, dateTimeToShowJson.month - 1);
      previousMonthDateNumber = this.convertToNumber1(this.getDateTimeJsonPersian1(this.getLastDayDateOfPreviousMonth(selectedDateToShowTemp, false)));
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      nextMonthDateNumber = this.convertToNumber1(this.getDateTimeJsonPersian1(this.getFirstDayDateOfNextMonth(selectedDateToShowTemp, false)));
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      previousYearDateNumber = this.convertToNumber2(dateTimeToShowJson.year - 1, dateTimeToShowJson.month, dateTimeToShowJson.day);
      nextYearDateNumber = this.convertToNumber2(dateTimeToShowJson.year + 1, dateTimeToShowJson.month, dateTimeToShowJson.day);
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      rangeSelectorStartDateNumber = !setting.rangeSelector || !rangeSelectorStartDate ? 0 : this.convertToNumber1(this.getDateTimeJsonPersian1(rangeSelectorStartDate));
      rangeSelectorEndDateNumber = !setting.rangeSelector || !rangeSelectorEndDate ? 0 : this.convertToNumber1(this.getDateTimeJsonPersian1(rangeSelectorEndDate));
      for (i = 1; i <= 12; i++) {
        monthsDateNumberAndAttr['month' + i.toString() + 'DateNumber'] = this.convertToNumber2(dateTimeToShowJson.year, i, this.getDaysInMonthPersian(dateTimeToShowJson.year, i));
        selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      }
      for (i = 0; i < setting.holidays.length; i++) {
        holidaysDateNumbers.push(this.convertToNumber1(this.getDateTimeJsonPersian1(setting.holidays[i])));
      }
      for (i = 0; i < setting.disabledDates.length; i++) {
        disabledDatesNumber.push(this.convertToNumber1(this.getDateTimeJsonPersian1(setting.disabledDates[i])));
      }
      for (i = 0; i < setting.specialDates.length; i++) {
        specialDatesNumber.push(this.convertToNumber1(this.getDateTimeJsonPersian1(setting.specialDates[i])));
      }
    }

    let todayDateNumber = this.convertToNumber1(todayDateTimeJson);
    let selectedYear = setting.isGregorian ? dateTimeToShowJson.year.toString() : this.toPersianNumber(dateTimeToShowJson.year);
    let disableBeforeDateTimeNumber = !disableBeforeDateTimeJson ? undefined : this.convertToNumber1(disableBeforeDateTimeJson);
    let disableAfterDateTimeNumber = !disableAfterDateTimeJson ? undefined : this.convertToNumber1(disableAfterDateTimeJson);
    let currentMonthInfo = this.getMonthName(dateTimeToShowJson.month - 1, setting.isGregorian) + ' ' + dateTimeToShowJson.year.toString();
    if (!setting.isGregorian)
      currentMonthInfo = this.toPersianNumber(currentMonthInfo);
    selectedMonthName = this.getMonthName(dateTimeToShowJson.month - 1, setting.isGregorian);

    if (setting.yearOffset <= 0) {
      previousYearButtonDisabledAttribute = 'disabled';
      nextYearButtonDisabledAttribute = 'disabled';
      selectYearButtonDisabledAttribute = 'disabled';
    }

    // روز های ماه قبل
    if (!setting.isGregorian && firstWeekDayNumber != 6 || setting.isGregorian && firstWeekDayNumber != 0) {
      if (setting.isGregorian)
        firstWeekDayNumber--;
      let previousMonthDateTimeJson = this.addMonthToDateTimeJson(dateTimeToShowJson, -1, setting.isGregorian);
      for (i = numberOfDaysInPreviousMonth - firstWeekDayNumber; i <= numberOfDaysInPreviousMonth; i++) {
        currentDateNumber = this.convertToNumber2(previousMonthDateTimeJson.year, previousMonthDateTimeJson.month, i);
        dayNumberInString = setting.isGregorian ? this.zeroPad(i) : this.toPersianNumber(this.zeroPad(i));
        td = document.createElement('TD');
        td.setAttribute('data-nm', '');
        td.setAttribute('data-number', currentDateNumber.toString());
        td.innerHTML = dayNumberInString;
        if (setting.rangeSelector) {
          if (currentDateNumber == rangeSelectorStartDateNumber || currentDateNumber == rangeSelectorEndDateNumber)
            td.classList.add('selected-range-days-start-end');
          else if (rangeSelectorStartDateNumber > 0 && rangeSelectorEndDateNumber > 0 && currentDateNumber > rangeSelectorStartDateNumber && currentDateNumber < rangeSelectorEndDateNumber)
            td.classList.add('selected-range-days-nm');
        }
        // روز جمعه
        if (!setting.isGregorian && tdNumber == 6)
          td.classList.add('text-danger');
        // روز یکشنبه
        else if (setting.isGregorian && tdNumber == 0)
          td.classList.add('text-danger');
        tr.appendChild(td);
        cellNumber++;
        tdNumber++;
        if (tdNumber >= 7) {
          tdNumber = 0;
          daysHtml += tr.outerHTML;
          isTrAppended = true;
          tr = document.createElement('TR');
        }
      }
    }

    // روزهای ماه جاری
    for (i = 1; i <= numberOfDaysInCurrentMonth; i++) {

      if (tdNumber >= 7) {
        tdNumber = 0;
        daysHtml += tr.outerHTML;
        isTrAppended = true;
        tr = document.createElement('TR');
      }

      // عدد روز
      currentDateNumber = this.convertToNumber2(dateTimeToShowJson.year, dateTimeToShowJson.month, i);
      dayNumberInString = setting.isGregorian ? this.zeroPad(i) : this.toPersianNumber(this.zeroPad(i));

      td = document.createElement('TD');
      td.setAttribute('data-day', '');
      td.setAttribute('data-number', currentDateNumber.toString());
      td.innerHTML = dayNumberInString;

      // امروز
      if (currentDateNumber == todayDateNumber) {
        td.setAttribute('data-today', '');
        td.setAttribute('title', setting.isGregorian ? this.todayText : this.todayTextPersian);
        // اگر نام روز هفته انتخاب شده در تکس باکس قبل از تاریخ امروز باشد
        // نباید دیگر نام روز هفته تغییر کند
        if (!dayOfWeek)
          dayOfWeek = this.getWeekDayName(tdNumber - 1 < 0 ? 0 : tdNumber - 1, setting.isGregorian);
      }

      // روز از قبل انتخاب شده
      if (!setting.rangeSelector && selectedDateNumber == currentDateNumber) {
        td.setAttribute('data-mds-dtp-selected-day', '');
        dayOfWeek = this.getWeekDayName(tdNumber - 1 < 0 ? 0 : tdNumber - 1, setting.isGregorian);
      }

      // روزهای تعطیل
      for (j = 0; j < holidaysDateNumbers.length; j++) {
        if (holidaysDateNumbers[j] != currentDateNumber) continue;
        td.classList.add('text-danger');
        break;
      }

      // روز جمعه شمسی
      if (!setting.isGregorian && tdNumber == 6) {
        td.classList.add('text-danger');
      }
      // روز یکشنبه میلادی
      else if (setting.isGregorian && tdNumber == 0) {
        td.classList.add('text-danger');
      }

      // روزهای غیر فعال شده
      if (setting.disableBeforeToday) {
        if (currentDateNumber < todayDateNumber) td.setAttribute('disabled', '');
        if (nextMonthDateNumber < todayDateNumber)
          nextMonthButtonDisabledAttribute = 'disabled';
        if (nextYearDateNumber < todayDateNumber)
          nextYearButtonDisabledAttribute = 'disabled';
        if (previousMonthDateNumber < todayDateNumber)
          previousMonthButtonDisabledAttribute = 'disabled';
        if (previousYearDateNumber < todayDateNumber)
          previousYearButtonDisabledAttribute = 'disabled';
        for (j = 1; j <= 12; j++) {
          if (monthsDateNumberAndAttr['month' + j.toString() + 'DateNumber'] < todayDateNumber)
            monthsDateNumberAndAttr['selectMonth' + j.toString() + 'ButtonCssClass'] = 'disabled';
        }
      }
      if (setting.disableAfterToday) {
        if (currentDateNumber > todayDateNumber) td.setAttribute('disabled', '');
        if (nextMonthDateNumber > todayDateNumber)
          nextMonthButtonDisabledAttribute = 'disabled';
        if (nextYearDateNumber > todayDateNumber)
          nextYearButtonDisabledAttribute = 'disabled';
        if (previousMonthDateNumber > todayDateNumber)
          previousMonthButtonDisabledAttribute = 'disabled';
        if (previousYearDateNumber > todayDateNumber)
          previousYearButtonDisabledAttribute = 'disabled';
        for (j = 1; j <= 12; j++) {
          if (monthsDateNumberAndAttr['month' + j.toString() + 'DateNumber'] > todayDateNumber)
            monthsDateNumberAndAttr['selectMonth' + j.toString() + 'ButtonCssClass'] = 'disabled';
        }
      }
      if (disableAfterDateTimeNumber) {
        if (currentDateNumber > disableAfterDateTimeNumber) td.setAttribute('disabled', '');
        if (nextMonthDateNumber > disableAfterDateTimeNumber)
          nextMonthButtonDisabledAttribute = 'disabled';
        if (nextYearDateNumber > disableAfterDateTimeNumber)
          nextYearButtonDisabledAttribute = 'disabled';
        if (previousMonthDateNumber > disableAfterDateTimeNumber)
          previousMonthButtonDisabledAttribute = 'disabled';
        if (previousYearDateNumber > disableAfterDateTimeNumber)
          previousYearButtonDisabledAttribute = 'disabled';
        for (j = 1; j <= 12; j++) {
          if (monthsDateNumberAndAttr['month' + j.toString() + 'DateNumber'] > disableAfterDateTimeNumber)
            monthsDateNumberAndAttr['selectMonth' + j.toString() + 'ButtonCssClass'] = 'disabled';
        }
      }
      if (disableBeforeDateTimeNumber) {
        if (currentDateNumber < disableBeforeDateTimeNumber) td.setAttribute('disabled', '');
        if (nextMonthDateNumber < disableBeforeDateTimeNumber)
          nextMonthButtonDisabledAttribute = 'disabled';
        if (nextYearDateNumber < disableBeforeDateTimeNumber)
          nextYearButtonDisabledAttribute = 'disabled';
        if (previousMonthDateNumber < disableBeforeDateTimeNumber)
          previousMonthButtonDisabledAttribute = 'disabled';
        if (previousYearDateNumber < disableBeforeDateTimeNumber)
          previousYearButtonDisabledAttribute = 'disabled';
        for (j = 1; j <= 12; j++) {
          if (monthsDateNumberAndAttr['month' + j.toString() + 'DateNumber'] < disableBeforeDateTimeNumber)
            monthsDateNumberAndAttr['selectMonth' + j.toString() + 'ButtonCssClass'] = 'disabled';
        }
      }
      for (j = 0; j < disabledDatesNumber.length; j++) {
        if (currentDateNumber == disabledDatesNumber[j])
          td.setAttribute('disabled', '');
      }
      for (j = 0; j < specialDatesNumber.length; j++) {
        if (currentDateNumber == specialDatesNumber[j])
          td.setAttribute('data-special-date', '');
      }
      if (setting.disabledDays != null && setting.disabledDays.length > 0 && setting.disabledDays.indexOf(tdNumber) >= 0) {
        td.setAttribute('disabled', '');
      }
      // \\

      if (setting.rangeSelector) {
        if (currentDateNumber == rangeSelectorStartDateNumber || currentDateNumber == rangeSelectorEndDateNumber)
          td.classList.add('selected-range-days-start-end');
        else if (rangeSelectorStartDateNumber > 0 && rangeSelectorEndDateNumber > 0 && currentDateNumber > rangeSelectorStartDateNumber && currentDateNumber < rangeSelectorEndDateNumber)
          td.classList.add('selected-range-days');
      }

      tr.appendChild(td);
      isTrAppended = false;

      tdNumber++;
      cellNumber++;
    }

    if (tdNumber >= 7) {
      tdNumber = 0;
      daysHtml += tr.outerHTML;
      isTrAppended = true;
      tr = document.createElement('TR');
    }

    // روزهای ماه بعد
    let nextMonthDateTimeJson = this.addMonthToDateTimeJson(dateTimeToShowJson, 1, setting.isGregorian);
    for (i = 1; i <= 42 - cellNumber; i++) {
      dayNumberInString = setting.isGregorian ? this.zeroPad(i) : this.toPersianNumber(this.zeroPad(i));
      currentDateNumber = this.convertToNumber2(nextMonthDateTimeJson.year, nextMonthDateTimeJson.month, i);
      td = document.createElement('TD');
      td.setAttribute('data-nm', '');
      td.setAttribute('data-number', currentDateNumber.toString());
      td.innerHTML = dayNumberInString;
      if (setting.rangeSelector) {
        if (currentDateNumber == rangeSelectorStartDateNumber || currentDateNumber == rangeSelectorEndDateNumber)
          td.classList.add('selected-range-days-start-end');
        else if (rangeSelectorStartDateNumber > 0 && rangeSelectorEndDateNumber > 0 && currentDateNumber > rangeSelectorStartDateNumber && currentDateNumber < rangeSelectorEndDateNumber)
          td.classList.add('selected-range-days-nm');
      }
      // روز جمعه
      if (!setting.isGregorian && tdNumber == 6)
        td.classList.add('text-danger');
      // روز یکشنبه
      else if (setting.isGregorian && tdNumber == 0)
        td.classList.add('text-danger');
      tr.appendChild(td);
      tdNumber++;
      if (tdNumber >= 7) {
        tdNumber = 0;
        daysHtml += tr.outerHTML;
        isTrAppended = true;
        tr = document.createElement('TR');
      }
    }

    if (!isTrAppended) {
      daysHtml += tr.outerHTML;
      isTrAppended = true;
    }

    html = html.replace(/\{\{currentMonthInfo\}\}/img, currentMonthInfo);
    html = html.replace(/\{\{selectedYear\}\}/img, selectedYear);
    html = html.replace(/\{\{selectedMonthName\}\}/img, selectedMonthName);
    html = html.replace(/\{\{daysHtml\}\}/img, daysHtml);
    html = html.replace(/\{\{previousYearButtonDisabledAttribute\}\}/img, previousYearButtonDisabledAttribute);
    html = html.replace(/\{\{previousYearButtonDateNumber\}\}/img, previousYearDateNumber.toString());
    html = html.replace(/\{\{previousMonthButtonDisabledAttribute\}\}/img, previousMonthButtonDisabledAttribute);
    html = html.replace(/\{\{previousMonthButtonDateNumber\}\}/img, previousMonthDateNumber.toString());
    html = html.replace(/\{\{selectYearButtonDisabledAttribute\}\}/img, selectYearButtonDisabledAttribute);
    html = html.replace(/\{\{nextMonthButtonDisabledAttribute\}\}/img, nextMonthButtonDisabledAttribute);
    html = html.replace(/\{\{nextMonthButtonDateNumber\}\}/img, nextMonthDateNumber.toString());
    html = html.replace(/\{\{nextYearButtonDisabledAttribute\}\}/img, nextYearButtonDisabledAttribute);
    html = html.replace(/\{\{nextYearButtonDateNumber\}\}/img, nextYearDateNumber.toString());
    html = html.replace(/\{\{dropDownMenuMonth1DateNumber\}\}/img, monthsDateNumberAndAttr.month1DateNumber);
    html = html.replace(/\{\{dropDownMenuMonth2DateNumber\}\}/img, monthsDateNumberAndAttr.month2DateNumber);
    html = html.replace(/\{\{dropDownMenuMonth3DateNumber\}\}/img, monthsDateNumberAndAttr.month3DateNumber);
    html = html.replace(/\{\{dropDownMenuMonth4DateNumber\}\}/img, monthsDateNumberAndAttr.month4DateNumber);
    html = html.replace(/\{\{dropDownMenuMonth5DateNumber\}\}/img, monthsDateNumberAndAttr.month5DateNumber);
    html = html.replace(/\{\{dropDownMenuMonth6DateNumber\}\}/img, monthsDateNumberAndAttr.month6DateNumber);
    html = html.replace(/\{\{dropDownMenuMonth7DateNumber\}\}/img, monthsDateNumberAndAttr.month7DateNumber);
    html = html.replace(/\{\{dropDownMenuMonth8DateNumber\}\}/img, monthsDateNumberAndAttr.month8DateNumber);
    html = html.replace(/\{\{dropDownMenuMonth9DateNumber\}\}/img, monthsDateNumberAndAttr.month9DateNumber);
    html = html.replace(/\{\{dropDownMenuMonth10DateNumber\}\}/img, monthsDateNumberAndAttr.month10DateNumber);
    html = html.replace(/\{\{dropDownMenuMonth11DateNumber\}\}/img, monthsDateNumberAndAttr.month11DateNumber);
    html = html.replace(/\{\{dropDownMenuMonth12DateNumber\}\}/img, monthsDateNumberAndAttr.month12DateNumber);
    html = html.replace(/\{\{selectMonth1ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth1ButtonCssClass);
    html = html.replace(/\{\{selectMonth2ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth2ButtonCssClass);
    html = html.replace(/\{\{selectMonth3ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth3ButtonCssClass);
    html = html.replace(/\{\{selectMonth4ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth4ButtonCssClass);
    html = html.replace(/\{\{selectMonth5ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth5ButtonCssClass);
    html = html.replace(/\{\{selectMonth6ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth6ButtonCssClass);
    html = html.replace(/\{\{selectMonth7ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth7ButtonCssClass);
    html = html.replace(/\{\{selectMonth8ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth8ButtonCssClass);
    html = html.replace(/\{\{selectMonth9ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth9ButtonCssClass);
    html = html.replace(/\{\{selectMonth10ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth10ButtonCssClass);
    html = html.replace(/\{\{selectMonth11ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth11ButtonCssClass);
    html = html.replace(/\{\{selectMonth12ButtonCssClass\}\}/img, monthsDateNumberAndAttr.selectMonth12ButtonCssClass);

    return html;
  }
  private hideYearsBox = (): void => {
    if (this.tempTitleString) {
      const popoverElement = this.getPopover(document.querySelector(`[data-mds-dtp-guid="${this.guid}"]`));
      popoverElement.querySelector('[mds-dtp-title]').innerHTML = this.tempTitleString;
    }
    const yearListBox = this.getPopover(this.element).querySelector('[data-mds-dtp-year-list-box]');
    yearListBox.classList.add('w-0');
    yearListBox.innerHTML = '';
  };
  private changeYearList = (element: Element): void => {
    // کلیک روی دکمه های عوض کردن رنج سال انتخابی
    const instance = MdsPersianDateTimePicker.getInstance(element);
    const setting = instance.setting;
    const isNext = element.getAttribute('data-year-range-button-change') == '1';
    const yearStart = Number(element.getAttribute('data-year'));
    const yearsToSelectObject = this.getYearsBoxBodyHtml(setting, isNext ? yearStart : yearStart - setting.yearOffset * 2);
    element.closest('[data-mds-dtp]').querySelector('[data-mds-dtp-year-list-box]').innerHTML = yearsToSelectObject.html;
    this.setPopoverHeaderHtml(element, setting.inLine, this.getYearsBoxHeaderHtml(setting, yearsToSelectObject.yearStart, yearsToSelectObject.yearEnd));
  };
  private showYearsBox = (element: Element): void => {
    this.tempTitleString = document.querySelector('[mds-dtp-title]').textContent.trim();
    const instance = MdsPersianDateTimePicker.getInstance(element);
    const setting = instance.setting;
    const yearsToSelectObject = this.getYearsBoxBodyHtml(setting, 0);
    const dateTimePickerYearsToSelectHtml = yearsToSelectObject.html;
    const mdDatePickerContainerSelector = element.closest('[data-mds-dtp]');
    const dateTimePickerYearsToSelectContainer = mdDatePickerContainerSelector.querySelector('[data-mds-dtp-year-list-box]');
    this.setPopoverHeaderHtml(element, setting.inLine, this.getYearsBoxHeaderHtml(setting, yearsToSelectObject.yearStart, yearsToSelectObject.yearEnd));
    dateTimePickerYearsToSelectContainer.innerHTML = dateTimePickerYearsToSelectHtml;
    dateTimePickerYearsToSelectContainer.classList.remove('w-0');
    if (setting.inLine)
      dateTimePickerYearsToSelectContainer.classList.add('inline');
    else
      dateTimePickerYearsToSelectContainer.classList.remove('inline');
  }
  private getPopoverHeaderTitle(setting: MdsPersianDateTimePickerSetting): string {
    let selectedDateToShowJson: GetDateTimeJson1;
    let title = '';
    if (setting.isGregorian) {
      selectedDateToShowJson = this.getDateTimeJson1(setting.selectedDateToShow);
    } else {
      selectedDateToShowJson = this.getDateTimeJsonPersian1(setting.selectedDateToShow);
    }
    if (setting.rangeSelector) {
      const startDate = this.addMonthToDateTime(setting.selectedDateToShow, -setting.rangeSelectorMonthsToShow[0], setting.isGregorian);
      const endDate = this.addMonthToDateTime(setting.selectedDateToShow, setting.rangeSelectorMonthsToShow[1], setting.isGregorian);
      let statDateJson: GetDateTimeJson1;
      let endDateJson: GetDateTimeJson1;
      if (setting.isGregorian) {
        statDateJson = this.getDateTimeJson1(startDate);
        endDateJson = this.getDateTimeJson1(endDate);
      } else {
        statDateJson = this.getDateTimeJsonPersian1(startDate);
        endDateJson = this.getDateTimeJsonPersian1(endDate);
      }
      const startMonthName = this.getMonthName(statDateJson.month - 1, setting.isGregorian);
      const endMonthName = this.getMonthName(endDateJson.month - 1, setting.isGregorian);
      title = `${startMonthName} ${statDateJson.year} - ${endMonthName} ${endDateJson.year}`;
    }
    else
      title = `${this.getMonthName(selectedDateToShowJson.month - 1, setting.isGregorian)} ${selectedDateToShowJson.year}`;
    if (!setting.isGregorian)
      title = this.toPersianNumber(title);
    return title;
  }
  private setPopoverHeaderHtml = (element: Element, isInLine: boolean, htmlString: string): void => {
    // element = المانی که روی آن فعالیتی انجام شده و باید عنوان تقویم آن عوض شود    
    if (!isInLine) {
      const popoverElement = this.getPopover(element);
      popoverElement.querySelector('[mds-dtp-title]').innerHTML = htmlString;
    } else {
      let inlineTitleBox = element.closest(this.mdDatePickerFlagSelector).querySelector('[data-name="dtp-years-container"]');
      inlineTitleBox.innerHTML = htmlString;
      inlineTitleBox.classList.remove('w-0');
    }
  }
  private getDateTimePickerBodyHtml(setting: MdsPersianDateTimePickerSetting): string {
    let selectedDateToShow = this.getClonedDate(setting.selectedDateToShow);
    let html = this.dateTimePickerHtmlTemplate;

    html = html.replace(/\{\{rtlCssClass\}\}/img, setting.isGregorian ? '' : 'rtl');
    html = html.replace(/\{\{selectedDateStringAttribute\}\}/img, setting.inLine ? '' : 'hidden');
    html = html.replace(/\{\{goTodayText\}\}/img, setting.isGregorian ? this.goTodayText : this.goTodayTextPersian);
    html = html.replace(/\{\{timePickerAttribute\}\}/img, setting.enableTimePicker ? '' : 'hidden');

    const disabledDays = this.getDisabledDateObject(setting);
    let title = '';
    let todayDateString = '';
    let todayDateTimeJson: GetDateTimeJson1;
    let selectedDateTimeToShowJson: GetDateTimeJson1;
    let disableBeforeDateTimeJson: GetDateTimeJson1 | undefined = disabledDays[0];
    let disableAfterDateTimeJson: GetDateTimeJson1 | undefined = disabledDays[1];

    if (setting.isGregorian) {
      selectedDateTimeToShowJson = this.getDateTimeJson1(selectedDateToShow);
      todayDateTimeJson = this.getDateTimeJson1(new Date());
    } else {
      selectedDateTimeToShowJson = this.getDateTimeJsonPersian1(selectedDateToShow);
      todayDateTimeJson = this.getDateTimeJsonPersian1(new Date());
    }

    title = this.getPopoverHeaderTitle(setting);
    todayDateString = `${setting.isGregorian ? 'Today,' : 'امروز،'} ${todayDateTimeJson.day} ${this.getMonthName(todayDateTimeJson.month - 1, setting.isGregorian)} ${todayDateTimeJson.year}`;
    if (!setting.isGregorian) {
      todayDateString = this.toPersianNumber(todayDateString);
    }

    if (disableAfterDateTimeJson != undefined && disableAfterDateTimeJson.year <= selectedDateTimeToShowJson.year && disableAfterDateTimeJson.month < selectedDateTimeToShowJson.month)
      selectedDateToShow = setting.isGregorian ? new Date(disableAfterDateTimeJson.year, disableAfterDateTimeJson.month - 1, 1) : this.getDateTime1(disableAfterDateTimeJson.year, disableAfterDateTimeJson.month, disableAfterDateTimeJson.day);

    if (disableBeforeDateTimeJson != undefined && disableBeforeDateTimeJson.year >= selectedDateTimeToShowJson.year && disableBeforeDateTimeJson.month > selectedDateTimeToShowJson.month)
      selectedDateToShow = setting.isGregorian ? new Date(disableBeforeDateTimeJson.year, disableBeforeDateTimeJson.month - 1, 1) : this.getDateTime1(disableBeforeDateTimeJson.year, disableBeforeDateTimeJson.month, disableBeforeDateTimeJson.day);

    let monthsTdHtml = '';
    let numberOfNextMonths = setting.rangeSelectorMonthsToShow[1] <= 0 ? 0 : setting.rangeSelectorMonthsToShow[1];
    let numberOfPrevMonths = setting.rangeSelectorMonthsToShow[0] <= 0 ? 0 : setting.rangeSelectorMonthsToShow[0];
    numberOfPrevMonths *= -1;
    for (let i1 = numberOfPrevMonths; i1 < 0; i1++) {
      setting.selectedDateToShow = this.addMonthToDateTime(this.getClonedDate(selectedDateToShow), i1, false);
      monthsTdHtml += this.getDateTimePickerMonthHtml(setting, false, true);
    }
    setting.selectedDateToShow = this.getClonedDate(selectedDateToShow);
    monthsTdHtml += this.getDateTimePickerMonthHtml(setting, false, false);
    for (let i2 = 1; i2 <= numberOfNextMonths; i2++) {
      setting.selectedDateToShow = this.addMonthToDateTime(this.getClonedDate(selectedDateToShow), i2, false);
      monthsTdHtml += this.getDateTimePickerMonthHtml(setting, true, false);
    }

    let totalMonthNumberToShow = Math.abs(numberOfPrevMonths) + 1 + numberOfNextMonths;
    let monthTdStyle = totalMonthNumberToShow > 1 ? 'width: ' + (100 / totalMonthNumberToShow).toString() + '%;' : '';

    monthsTdHtml = monthsTdHtml.replace(/\{\{monthTdStyle\}\}/img, monthTdStyle);

    html = html.replace(/\{\{dtpInlineHeader\}\}/img, title);
    html = html.replace(/\{\{todayDateString\}\}/img, todayDateString);
    html = html.replace(/\{\{time\}\}/img, `${this.zeroPad(selectedDateTimeToShowJson.hour)}:${this.zeroPad(selectedDateTimeToShowJson.minute)}`);
    html = html.replace(/\{\{monthsTdHtml\}\}/img, monthsTdHtml);

    return html;
  }
  private updateCalendarBodyHtml = (element: Element, setting: MdsPersianDateTimePickerSetting): void => {
    const calendarHtml = this.getDateTimePickerBodyHtml(setting);
    const containerElement = element.closest('[data-name="mds-dtp-body"]');
    const dtpInlineHeader = calendarHtml.match(/<th mds-dtp-inline-header\b[^>]*>(.*?)<\/th>/img)[0];
    this.tempTitleString = dtpInlineHeader;
    this.setPopoverHeaderHtml(element, setting.inLine, dtpInlineHeader.trim());
    containerElement.innerHTML = calendarHtml;
    this.enableEvents();
  }
  private changeMonth = (element: Element): void => {
    const instance = MdsPersianDateTimePicker.getInstance(element);
    if (instance.setting.disabled) return;
    const dateNumber = Number(element.getAttribute('data-number'));
    const setting = instance.setting;
    let selectedDateToShow = instance.getClonedDate(setting.selectedDateToShow);
    selectedDateToShow = this.getDateTime4(dateNumber, selectedDateToShow, setting.isGregorian);
    setting.selectedDateToShow = this.getClonedDate(selectedDateToShow);
    MdsPersianDateTimePickerData.set(instance.guid, instance);
    this.updateCalendarBodyHtml(element, setting);
    if (setting.calendarViewOnChange != undefined)
      setting.calendarViewOnChange(selectedDateToShow);
  }
  private selectDay = (element: Element): void => {
    // انتخاب روز
    const instance = MdsPersianDateTimePicker.getInstance(element);
    if (instance.setting.disabled || element.getAttribute('disabled') != undefined)
      return;
    let dateNumber = Number(element.getAttribute('data-number'));
    const setting = instance.setting;
    const disabled = element.getAttribute('disabled') != undefined;
    let selectedDateJson = setting.selectedDate == undefined ? undefined : this.getDateTimeJson1(setting.selectedDate);
    let selectedDateToShow = this.getClonedDate(setting.selectedDateToShow);
    let selectedDateToShowJson = selectedDateToShow == undefined ? undefined : this.getDateTimeJson1(selectedDateToShow);
    if (disabled) {
      if (setting.onDayClick != undefined) setting.onDayClick(setting);
      return;
    }
    selectedDateToShow = this.getDateTime4(dateNumber, selectedDateToShow, setting.isGregorian);
    if (setting.rangeSelector) { // اگر رنج سلکتور فعال بود
      if (setting.rangeSelectorStartDate != undefined && setting.rangeSelectorEndDate != undefined) {
        setting.selectedRangeDate = [];
        setting.rangeSelectorStartDate = undefined;
        setting.rangeSelectorEndDate = undefined;
        element.closest('[data-mds-dtp]').querySelectorAll('td.selected-range-days-start-end,td.selected-range-days')
          .forEach(e => {
            e.classList.remove('selected-range-days');
            e.classList.remove('selected-range-days-start-end');
          });
      }
      if (setting.rangeSelectorStartDate == undefined) {
        element.classList.add('selected-range-days-start-end');
        setting.rangeSelectorStartDate = this.getClonedDate(selectedDateToShow);
        setting.selectedDate = this.getClonedDate(selectedDateToShow);
        setting.selectedDateToShow = this.getClonedDate(selectedDateToShow);
      } else if (setting.rangeSelectorStartDate != undefined && setting.rangeSelectorEndDate == undefined) {
        if (setting.rangeSelectorStartDate.getTime() >= selectedDateToShow.getTime())
          return;
        element.classList.add('selected-range-days-start-end');
        setting.rangeSelectorEndDate = this.getClonedDate(selectedDateToShow);
        this.setSelectedData(setting);
      }
      MdsPersianDateTimePickerData.set(instance.guid, instance);
      if (setting.rangeSelectorStartDate != undefined && setting.rangeSelectorEndDate != undefined) {
        setting.selectedRangeDate = [this.getClonedDate(setting.rangeSelectorStartDate), this.getClonedDate(setting.rangeSelectorEndDate)];
        if (!setting.inLine) {
          instance.hide();
        } else
          this.updateCalendarBodyHtml(element, setting);
      }
      return;
    }
    this.getPopover(element).querySelectorAll('[data-day]').forEach(e => e.removeAttribute('data-mds-dtp-selected-day'));
    element.setAttribute('data-mds-dtp-selected-day', '');
    setting.selectedDate = this.getClonedDate(selectedDateToShow);
    setting.selectedDateToShow = this.getClonedDate(selectedDateToShow);
    if (selectedDateJson != undefined) {
      selectedDateJson.hour = selectedDateToShowJson.hour;
      selectedDateJson.minute = selectedDateToShowJson.minute;
      selectedDateJson.second = selectedDateToShowJson.second;
      setting.selectedDate.setHours(selectedDateJson.hour);
      setting.selectedDate.setMinutes(selectedDateJson.minute);
      setting.selectedDate.setSeconds(selectedDateJson.second);
    }
    MdsPersianDateTimePickerData.set(instance.guid, instance);
    this.setSelectedData(setting);
    if (!setting.inLine) {
      instance.hide();
    }
    if (setting.inLine && (setting.toDate || setting.fromDate)) {
      // وقتی روی روز یکی از تقویم ها کلیک می شود
      // باید تقویم دیگر نیز تغییر کند و روزهایی از آن غیر فعال شود
      const toDateElement = document.querySelector('[data-mds-dtp-group="' + setting.groupId + '"][data-to-date]');
      const fromDateElement = document.querySelector('[data-mds-dtp-group="' + setting.groupId + '"][data-from-date]');
      if (setting.fromDate && toDateElement != undefined) {
        this.updateCalendarBodyHtml(toDateElement, MdsPersianDateTimePicker.getInstance(toDateElement).setting);
      } else if (setting.toDate && fromDateElement != undefined) {
        this.updateCalendarBodyHtml(fromDateElement, MdsPersianDateTimePicker.getInstance(fromDateElement).setting);
      } else
        this.updateCalendarBodyHtml(element, setting);
    } else {
      this.updateCalendarBodyHtml(element, setting);
    }
    if (setting.onDayClick != undefined)
      setting.onDayClick(setting);
  }
  private hoverOnDays = (e: MouseEvent): void => {
    // هاور روی روزها
    const element = <Element>e.target;
    const instance = MdsPersianDateTimePicker.getInstance(element);
    const setting = instance.setting;

    if (element.getAttribute('disabled') != undefined || !setting.rangeSelector ||
      (setting.rangeSelectorStartDate != undefined && setting.rangeSelectorEndDate != undefined)) return;

    const dateNumber = Number(element.getAttribute('data-number'));
    const allDayElements: Element[] = [].slice.call(document.querySelectorAll('td[data-day]'));
    allDayElements.forEach(e => {
      e.classList.remove('selected-range-days');
      e.classList.remove('selected-range-days-nm');
    });

    const allNextOrPrevMonthDayElements: Element[] = [].slice.call(document.querySelectorAll('td[data-nm]'));
    allNextOrPrevMonthDayElements.forEach(e => {
      e.classList.remove('selected-range-days');
      e.classList.remove('selected-range-days-nm');
    });

    const rangeSelectorStartDate = !setting.rangeSelectorStartDate ? undefined : this.getClonedDate(setting.rangeSelectorStartDate);
    const rangeSelectorEndDate = !setting.rangeSelectorEndDate ? undefined : this.getClonedDate(setting.rangeSelectorEndDate);
    let rangeSelectorStartDateNumber = 0;
    let rangeSelectorEndDateNumber = 0;

    if (setting.isGregorian) {
      rangeSelectorStartDateNumber = !rangeSelectorStartDate ? 0 : this.convertToNumber3(rangeSelectorStartDate);
      rangeSelectorEndDateNumber = !rangeSelectorEndDate ? 0 : this.convertToNumber3(rangeSelectorEndDate);
    } else {
      rangeSelectorStartDateNumber = !rangeSelectorStartDate ? 0 : this.convertToNumber1(this.getDateTimeJsonPersian1(rangeSelectorStartDate));
      rangeSelectorEndDateNumber = !rangeSelectorEndDate ? 0 : this.convertToNumber1(this.getDateTimeJsonPersian1(rangeSelectorEndDate));
    }

    if (rangeSelectorStartDateNumber > 0 && dateNumber > rangeSelectorStartDateNumber) {
      for (var i1 = rangeSelectorStartDateNumber; i1 <= dateNumber; i1++) {
        allDayElements.filter(e => e.getAttribute('data-number') == i1.toString() && e.classList.value.indexOf('selected-range-days-start-end') <= -1)
          .forEach(e => e.classList.add('selected-range-days'));
        allNextOrPrevMonthDayElements.filter(e => e.getAttribute('data-number') == i1.toString() && e.classList.value.indexOf('selected-range-days-start-end') <= -1)
          .forEach(e => e.classList.add('selected-range-days-nm'));
      }
    } else if (rangeSelectorEndDateNumber > 0 && dateNumber < rangeSelectorEndDateNumber) {
      for (var i2 = dateNumber; i2 <= rangeSelectorEndDateNumber; i2++) {
        allDayElements.filter(e => e.getAttribute('data-number') == i2.toString() && e.classList.value.indexOf('selected-range-days-start-end') <= -1)
          .forEach(e => e.classList.add('selected-range-days'));
        allNextOrPrevMonthDayElements.filter(e => e.getAttribute('data-number') == i2.toString() && e.classList.value.indexOf('selected-range-days-start-end') <= -1)
          .forEach(e => e.classList.add('selected-range-days-nm'));
      }
    }

  }
  private goToday = (e: PointerEvent): void => {
    const element = <Element>e.target;
    const instance = MdsPersianDateTimePicker.getInstance(element);
    const setting = instance.setting;
    setting.selectedDateToShow = new Date();
    MdsPersianDateTimePickerData.set(instance.guid, instance);
    this.updateCalendarBodyHtml(element, setting);
  }
  private timeChanged = (e: Event): void => {
    // عوض کردن ساعت
    const element = <Element>e.target;
    const instance = MdsPersianDateTimePicker.getInstance(element);
    const setting = instance.setting;
    const value: string = (<any>element).value;
    if (!setting.enableTimePicker) return;
    if (setting.selectedDateToShow == undefined)
      setting.selectedDateToShow = new Date();
    let hour = Number(value.substr(0, 2));
    let minute = Number(value.substr(3, 2));
    setting.selectedDateToShow = new Date(setting.selectedDateToShow.setHours(hour));
    setting.selectedDateToShow = new Date(setting.selectedDateToShow.setMinutes(minute));
    if (setting.selectedDate == undefined)
      setting.selectedDate = new Date();
    setting.selectedDate = new Date(setting.selectedDate.setHours(hour));
    setting.selectedDate = new Date(setting.selectedDate.setMinutes(minute));
    MdsPersianDateTimePickerData.set(instance.guid, instance);
    this.setSelectedData(setting);
  }
  private enableMainEvents(): void {
    this.element.addEventListener('shown.bs.popover', this.popoverShownEvent);
    this.element.addEventListener('hidden.bs.popover', this.popoverHiddenEvent);
    this.element.addEventListener('inserted.bs.popover', this.popoverInsertedEvent);
    this.element.addEventListener('click', this.showPopoverEvent, true);
  }
  private popoverInsertedEvent = (e: CustomEvent): void => {
    this.hideYearsBox();
    const element = <Element>e.target;
    const instance = MdsPersianDateTimePicker.getInstance(element);
    const setting = instance.setting;
    if (setting.toDate || setting.fromDate) {
      const disabledDates = this.getDisabledDateObject(setting);
      const disableBeforeDateNumber = disabledDates[0] != null ? Number(this.zeroPad(disabledDates[0].year, '0000') + this.zeroPad(disabledDates[0].month) + this.zeroPad(disabledDates[0].day)) : 0;
      const disableAfterDateNumber = disabledDates[1] != null ? Number(this.zeroPad(disabledDates[1].year, '0000') + this.zeroPad(disabledDates[1].month) + this.zeroPad(disabledDates[1].day)) : 0;
      if (disableBeforeDateNumber > 0 || disableAfterDateNumber > 0) {
        const popoverElement = this.getPopover(element);
        popoverElement.querySelectorAll('[data-day]').forEach(e => {
          const dateNumber = Number(e.getAttribute('data-number'));
          if (setting.fromDate && dateNumber >= disableAfterDateNumber || setting.toDate && dateNumber <= disableBeforeDateNumber)
            e.setAttribute('disabled', '');
          else
            e.removeAttribute('disabled');
        });
      }
    }
  }
  private popoverShownEvent = (): void => {
    this.enableEvents();
  }
  private popoverHiddenEvent = (e: CustomEvent): void => {
    this.disableEvents();
  }
  private enableEvents(): void {
    setTimeout(() => {
      document.querySelector('[data-mds-dtp-time]').addEventListener('change', this.timeChanged, false);
      document.querySelector('[data-mds-dtp-go-today]').addEventListener('click', this.goToday, false);
      document.addEventListener('click', this.selectCorrectClickEvent, false);
      document.querySelector('html').addEventListener('click', this.hidePopoverEvent, true);
      document.querySelectorAll('[data-mds-dtp] [data-day]').forEach(e => e.addEventListener('mouseenter', this.hoverOnDays, true));
    }, 100);
  }
  private disableEvents(): void {
    document.removeEventListener('click', this.selectCorrectClickEvent);
    document.querySelector('[data-mds-dtp-time]')?.removeEventListener('change', this.timeChanged);
    document.querySelector('[data-mds-dtp-go-today]')?.removeEventListener('click', this.goToday);
    document.querySelector('html').removeEventListener('click', this.hidePopoverEvent);
    document.querySelectorAll('[data-mds-dtp] [data-day]').forEach(e => e.removeEventListener('mouseenter', this.hoverOnDays));
  }
  private selectCorrectClickEvent = (e: PointerEvent): void => {
    const element = <Element>e.target;
    const instance = MdsPersianDateTimePicker.getInstance(element);
    if (element.getAttribute('mds-pdtp-select-year-button') != null) {
      instance.showYearsBox(element);
    } else if (element.getAttribute('data-day') != null) {
      this.selectDay(element);
    } else if (element.getAttribute('data-mds-hide-year-list-box')) {
      this.hideYearsBox();
    } else if (element.getAttribute('data-change-date-button')) {
      this.changeMonth(element);
    } else if (element.getAttribute('data-year-range-button-change') != null && element.getAttribute('disabled') == null) {
      this.changeYearList(element);
    }
  }
  private showPopoverEvent = (e: PointerEvent): void => {
    MdsPersianDateTimePickerData.getAll().forEach(i => i.hide());
    const element = <Element>e.target;
    const instance = MdsPersianDateTimePicker.getInstance(element);
    if (instance.setting.disabled) return;
    instance.show();
  }
  private hidePopoverEvent = (e: PointerEvent): void => {
    const element = <Element>e.target;
    if (element.tagName == 'HTML') {
      MdsPersianDateTimePickerData.getAll().forEach(i => i.hide());
      return;
    }
    const isWithinDatePicker = element.closest('[data-mds-dtp]') != null || element.getAttribute('data-mds-dtp-guid') != null || element.getAttribute('data-mds-dtp-go-today') != null;
    if (!isWithinDatePicker) {
      MdsPersianDateTimePickerData.getAll().forEach(i => i.hide());
    }
  }

  /**
   * نمایش تقویم
   */
  show(): void {
    if (this.bsPopover == null) return;
    this.bsPopover.show();
  }
  /**
   * مخفی کردن تقویم
   */
  hide(): void {
    if (this.bsPopover == null) return;
    this.bsPopover.hide();
  }
  /**
   * مخفی یا نمایش تقویم 
   */
  toggle(): void {
    if (this.bsPopover == null) return;
    this.bsPopover.toggle();
  }
  /**
   * فعال کردن تقویم
   */
  enable(): void {
    this.setting.disabled = false;
    this.element.removeAttribute("disabled");
    MdsPersianDateTimePickerData.set(this.guid, this);
    this.bsPopover.enable();
  }
  /**
   * غیر فعال کردن تقویم
   */
  disable(): void {
    this.setting.disabled = true;
    this.element.setAttribute("disabled", '');
    MdsPersianDateTimePickerData.set(this.guid, this);
    this.bsPopover.disable();
  }
  /**
   * بروز کردن محل قرار گرفتن تقویم
   */
  updatePosition(): void {
    this.bsPopover.update();
  }
  /**
   * به روز کردن متن نمایش تاریخ روز انتخاب شده
   */
  updateSelectedDateText(): void {
    this.setSelectedData(this.setting);
  }
  /**
   * از بین بردن تقویم
   */
  dispose(): void {
    if (this.bsPopover == null) return;
    this.bsPopover.dispose();
    this.element.removeEventListener('click', this.showPopoverEvent);
    this.bsPopover = null;
  }
  /**
   * دریافت اینستنس پاپ آور بوت استرپ
   */
  getBsPopoverInstance(): Popover {
    return this.bsPopover;
  }
  /**
   * بروز کردن تنظیمات تقویم
   * @param optionName نام آپشن مورد نظر
   * @param value مقدار
   */
  updateOption(optionName: string, value: any): void {
    (<any>this.setting)[optionName] = value;
    MdsPersianDateTimePickerData.set(this.guid, this);
    this.initializeBsPopover(this.setting);
  }

  /**
   * دریافت اینستنس تقویم از روی المانی که تقویم روی آن فعال شده است
   * @param element المانی که تقویم روی آن فعال شده
   * @returns اینستنس تقویم
   */
  static getInstance(element: Element): MdsPersianDateTimePicker {
    let elementGuid = element.getAttribute('data-mds-dtp-guid');
    if (!elementGuid) {
      const id = element.closest('[data-mds-dtp]')?.getAttribute('id');
      if (!id) return null;
      elementGuid = document.querySelector('[aria-describedby="' + id + '"]').getAttribute('data-mds-dtp-guid');
      if (!elementGuid)
        return null;
    };
    return MdsPersianDateTimePickerData.get(elementGuid);
  }

  // #endregion
}

enum AmPmEnum {
  am,
  pm,
  none
}

interface GetDateTimeJson1 {
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  dayOfWeek: number
}

interface MdsPersianDateTimePickerYearToSelect {
  yearStart: number,
  yearEnd: number,
  html: string
}

export class MdsPersianDateTimePickerSetting {
  /**
   * محل قرار گرفتن تقویم
   */
  placement: "auto" | "top" | "bottom" | "left" | "right" | (() => void) = 'bottom';
  /**
   * رویداد نمایش تقویم
   */
  trigger = 'click';
  /**
   * فعال بودن تایم پیکر
   */
  enableTimePicker = false;
  /**
   * سلکتور نمایش روز انتخاب شده
   */
  targetTextSelector = '';
  /**
   * سلکتور ذخیره تاریخ میلادی، برای روز انتخاب شده
   */
  targetDateSelector = '';
  /**
   * آیا تقویم برای کنترل روز پایانی تاریخ است
   */
  toDate = false;
  /**
   * آیا تقویم برای کنترل روز شروع تاریخ است
   */
  fromDate = false;
  /**
   * شناسه گروه در حالتی که از 
   * toDate
   * و
   * fromDate
   * استفاده شده است
   */
  groupId = '';
  /**
   * آیا تقویم غیر فعال است؟
   */
  disabled = false;
  /**
   * فرمت نمایش روز انتخاب شده تقویم
   */
  textFormat = '';
  /**
   * فرمت ذخیره تاریخ میلادی انتخاب شده
   */
  dateFormat = '';
  /**
   * آیا تقویم میلادی استفاده شود؟
   */
  isGregorian = false;
  /**
   * آیا تقویم به صورت این لاین نمایش داده شود؟
   */
  inLine = false;
  /**
   * تاریخ انتخاب شده
   */
  selectedDate: Date = null;
  /**
   * تاریخی که نمایش تقویم از آن شروع می شود
   */
  selectedDateToShow = new Date();
  /**
   * تعداد سال های قابل نمایش در لیست سال های قابل انتخاب
   */
  yearOffset = 15;
  /**
   * تاریخ میلادی روزهای تعطیل
   */
  holidays: Date[] = [];
  /**
   * تاریخ میلادی روزهای غیر فعال
   */
  disabledDates: Date[] = [];
  /**
   * عدد روزهایی از هفته که غیر فعال هستند
   */
  disabledDays: number[] = [];
  /**
   * تاریخ میلادی روزهای خاص
   */
  specialDates: Date[] = [];
  /**
   * آیا روزهای قبل از امروز غیر فعال شوند؟
   */
  disableBeforeToday = false;
  /**
   * آیا روزهای بعد از امروز غیر فعال شوند؟
   */
  disableAfterToday = false;
  /**
   * روزهای قبل از این تاریخ غیر فعال شود
   */
  disableBeforeDate: Date = null;
  /**
   * روزهای بعد از این تاریخ غیر فعال شود
   */
  disableAfterDate: Date = null;
  /**
   * آیا تقویم به صورت انتخاب بازه نمایش داده شود؟
   */
  rangeSelector = false;
  /**
   * تاریخ شروع تقویم در مد انتخاب بازه تاریخی برای نمایش
   */
  rangeSelectorStartDate: Date = null;
  /**
   * تاریخ پایان تقویم در مد انتخاب بازه تاریخی برای نمایش
   */
  rangeSelectorEndDate: Date = null;
  /**
   * تعداد ماه های قابل نمایش در قابلیت انتخاب بازه تاریخی
   */
  rangeSelectorMonthsToShow = [0, 0];
  /**
   * تاریخ های انتخاب شده در مد بازه انتخابی
   */
  selectedRangeDate: Date[] = [];
  /**
   * آیا تقویم به صورت مدال نمایش داده شود
   */
  modalMode = false;
  /**
   * رویداد عوض شدن ماه و تاریخ در دیت پیکر
   * @param _ تاریخ ماه انتخابی
   */
  calendarViewOnChange = (_: Date) => { };
  /**
   * رویداد انتخاب روز در دیت پیکر
   * @param _ تمامی تنظیمات دیت پیکر
   */
  onDayClick = (_: MdsPersianDateTimePickerSetting) => { }
}

const MdsPersianDateTimePickerElementMap = new Map();
var MdsPersianDateTimePickerData = {
  set(key: string, instance: MdsPersianDateTimePicker): void {
    if (!MdsPersianDateTimePickerElementMap.has(key)) {
      MdsPersianDateTimePickerElementMap.set(key, instance);
      return;
    }
    MdsPersianDateTimePickerElementMap.set(key, instance);
  },
  get(key: string): MdsPersianDateTimePicker {
    return MdsPersianDateTimePickerElementMap.get(key) || null;
  },
  getAll(): MdsPersianDateTimePicker[] {
    return Array.from(MdsPersianDateTimePickerElementMap, ([name, value]) => value);
  },
  remove(key: string): void {
    if (!MdsPersianDateTimePickerElementMap.has(key)) {
      return;
    }
    MdsPersianDateTimePickerElementMap.delete(key);
  }
};